"""Spike S2 tracer prototype (throwaway).

AST rewrite of single compares and subscripts, plus sys.settrace for call/line/return.
Events are plain dicts. Python ints beyond +-(2**53-1) become {"$bigint": "<decimal>"} so
JSON.stringify/JSON.parse on the JS side cannot silently round them.

Helper names use a single leading underscore (_av_*): a double underscore would be
name-mangled inside class bodies.
"""
import ast
import operator
import sys

_FILE = "<av-user>"
_SAFE = 2**53 - 1
_OPS = {
    "<": operator.lt, "<=": operator.le, ">": operator.gt, ">=": operator.ge,
    "==": operator.eq, "!=": operator.ne, "is": operator.is_, "is not": operator.is_not,
    "in": lambda a, b: a in b, "not in": lambda a, b: a not in b,
}
_SYM = {
    ast.Lt: "<", ast.LtE: "<=", ast.Gt: ">", ast.GtE: ">=", ast.Eq: "==", ast.NotEq: "!=",
    ast.Is: "is", ast.IsNot: "is not", ast.In: "in", ast.NotIn: "not in",
}


def _ser(v, copy=False):
    """JSON-safe value. Containers are shallow refs, or one-level copies when copy=True."""
    t = type(v)
    if v is None or t is bool or t is str:
        return v
    if t is int:
        return v if -_SAFE <= v <= _SAFE else {"$bigint": str(v)}
    if t is float:
        return v if v - v == 0 else {"$float": repr(v)}
    if t in (list, tuple, dict, set, frozenset):
        out = {"$type": t.__name__, "id": id(v), "len": len(v)}
        if copy and t in (list, tuple):
            out["items"] = [_ser(x) for x in v]
        return out
    return {"$type": t.__name__}


class _Tracer:
    def __init__(self, copy):
        self.events = []
        self.copy = copy
        self.line = 0
        self.origins = {}  # id(value) -> (value, container_id, key); cleared on every line event

    # --- runtime helpers called by rewritten code ---
    def cmp(self, op, a, b):
        res = _OPS[op](a, b)
        ev = {"kind": "compare", "op": op, "left": _ser(a), "right": _ser(b),
              "result": _ser(res), "line": self.line, "leftOrigin": None, "rightOrigin": None}
        for side, v in (("leftOrigin", a), ("rightOrigin", b)):
            o = self.origins.get(id(v))
            if o is not None and o[0] is v:
                ev[side] = {"container": o[1], "key": _ser(o[2])}
        self.events.append(ev)
        return res

    def get(self, obj, key):
        v = obj[key]
        self.origins[id(v)] = (v, id(obj), key)
        return v

    def set(self, obj, key, value):
        obj[key] = value
        self.events.append({"kind": "write", "container": id(obj), "key": _ser(key),
                            "value": _ser(value), "line": self.line})

    # --- sys.settrace hooks ---
    def snap(self, frame):
        return {k: _ser(v, self.copy) for k, v in frame.f_locals.items()
                if not k.startswith("_av_") and not k.startswith("__")}

    def glob(self, frame, event, arg):
        if frame.f_code.co_filename != _FILE:
            return None
        self.line = frame.f_lineno
        self.events.append({"kind": "call", "name": frame.f_code.co_name,
                            "line": self.line, "locals": self.snap(frame)})
        return self.local

    def local(self, frame, event, arg):
        if event == "line":
            self.origins.clear()
            self.line = frame.f_lineno
            self.events.append({"kind": "line", "line": self.line, "locals": self.snap(frame)})
        elif event == "return":
            self.events.append({"kind": "return", "line": frame.f_lineno,
                                "value": _ser(arg), "locals": self.snap(frame)})
        return self.local


def _has_slice(node):
    return isinstance(node, ast.Slice) or (
        isinstance(node, ast.Tuple) and any(_has_slice(e) for e in node.elts))


def _call(name, *args):
    return ast.Call(ast.Name(name, ast.Load()), list(args), [])


class _Rewriter(ast.NodeTransformer):
    def __init__(self):
        self.tmp = 0

    def visit_Compare(self, node):
        self.generic_visit(node)
        if len(node.ops) != 1:  # chained compares are left alone (spike scope)
            return node
        out = _call("_av_cmp", ast.Constant(_SYM[type(node.ops[0])]), node.left, node.comparators[0])
        return ast.copy_location(out, node)

    def visit_Subscript(self, node):
        self.generic_visit(node)
        if not isinstance(node.ctx, ast.Load) or _has_slice(node.slice):
            return node
        return ast.copy_location(_call("_av_get", node.value, node.slice), node)

    def _lower(self, target, value, node):
        """Statements storing `value` (an expr) into `target`; subscript stores become _av_set."""
        if isinstance(target, ast.Subscript) and not _has_slice(target.slice):
            call = _call("_av_set", self.visit(target.value), self.visit(target.slice), value)
            return [ast.copy_location(ast.Expr(call), node)]
        if isinstance(target, (ast.Tuple, ast.List)) and not any(
                isinstance(e, ast.Starred) for e in target.elts):
            tmp = f"_av_t{self.tmp}"
            self.tmp += 1
            out = [ast.copy_location(ast.Assign([ast.Name(tmp, ast.Store())], value), node)]
            for i, elt in enumerate(target.elts):
                item = ast.Subscript(ast.Name(tmp, ast.Load()), ast.Constant(i), ast.Load())
                out += self._lower(elt, item, node)
            return out
        return [ast.copy_location(ast.Assign([self.visit(target)], value), node)]

    def visit_Assign(self, node):
        node.value = self.visit(node.value)
        needs = lambda t: isinstance(t, (ast.Subscript, ast.Tuple, ast.List))
        if not any(needs(t) for t in node.targets):
            node.targets = [self.visit(t) for t in node.targets]
            return node
        if len(node.targets) == 1:
            return self._lower(node.targets[0], node.value, node)
        tmp = f"_av_t{self.tmp}"  # a = b[i] = v: evaluate v once
        self.tmp += 1
        out = [ast.copy_location(ast.Assign([ast.Name(tmp, ast.Store())], node.value), node)]
        for t in node.targets:
            out += self._lower(t, ast.Name(tmp, ast.Load()), node)
        return out


def trace_source(source: str, namespace: dict | None = None, copy_containers: bool = False) -> list[dict]:
    """Run `source` under the tracer and return the event list.

    copy_containers=False: locals snapshots hold shallow refs for containers (id, type, len).
    copy_containers=True: lists/tuples are copied one level deep into each snapshot.
    """
    tracer = _Tracer(copy_containers)
    tree = ast.fix_missing_locations(_Rewriter().visit(ast.parse(source, _FILE)))
    code = compile(tree, _FILE, "exec")
    ns = namespace if namespace is not None else {}
    helpers = {"_av_cmp": tracer.cmp, "_av_get": tracer.get, "_av_set": tracer.set}
    ns.update(helpers)
    previous = sys.gettrace()
    sys.settrace(tracer.glob)
    try:
        exec(code, ns)
    finally:
        sys.settrace(previous)
        for k in helpers:
            ns.pop(k, None)
        for k in [k for k in ns if k.startswith("_av_t")]:
            del ns[k]
    return tracer.events
