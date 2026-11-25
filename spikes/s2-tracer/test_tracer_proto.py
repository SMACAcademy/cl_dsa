import json

from tracer_proto import trace_source

BUBBLE = '''
def bubble_sort(arr):
    n = len(arr)
    for i in range(n):
        for j in range(n - 1 - i):
            if arr[j] > arr[j + 1]:
                arr[j], arr[j + 1] = arr[j + 1], arr[j]
    return arr
result = bubble_sort([5, 1, 4])
'''

def test_bubble_emits_compare_and_writes_in_order():
    events = trace_source(BUBBLE)
    kinds = [e["kind"] for e in events if e["kind"] in ("compare", "write")]
    assert kinds[:4] == ["compare", "write", "write", "compare"]   # 5>1 swaps, then 5>4

def test_compare_carries_origins():
    first = next(e for e in trace_source(BUBBLE) if e["kind"] == "compare")
    assert first["result"] is True
    assert first["leftOrigin"]["key"] == 0 and first["rightOrigin"]["key"] == 1

def test_program_result_unchanged():
    ns = {}
    trace_source(BUBBLE, namespace=ns)
    assert ns["result"] == [1, 4, 5]

# --- additions beyond the brief: payload fidelity and semantics preservation ---

PAYLOAD = '''
def f():
    big = 10**30
    s = "x" * 5000
    return len(s)
result = f()
'''

def test_big_int_and_long_string_survive_json():
    events = trace_source(PAYLOAD)
    back = json.loads(json.dumps(events))          # valid JSON, no exception
    ret = next(e for e in back if e["kind"] == "return" and e["locals"].get("big"))
    assert ret["locals"]["big"] == {"$bigint": str(10**30)}   # exact, not a rounded float
    assert ret["locals"]["s"] == "x" * 5000

def test_unrewritten_constructs_still_run():
    src = '''
class C:
    def m(self, a):
        return a[0] < a[1]
x = [3, 1, 2]
y = x[0:2]
x[0] += 10
chained = 1 < 2 < 3
cls = C().m(x)
'''
    ns = {}
    trace_source(src, namespace=ns)
    assert ns["y"] == [3, 1] and ns["x"][0] == 13 and ns["chained"] is True
    assert ns["cls"] is False


# --- unpacking semantics (fix round 1) ---

def _outcome(src, traced):
    ns = {}
    try:
        (trace_source(src, namespace=ns) if traced else exec(src, ns))
    except Exception as e:  # compare type and message with plain Python
        return type(e), str(e)
    return None, {k: v for k, v in ns.items() if not k.startswith("_") and k != "src"}

def test_unpack_generator_and_set_work():
    ns = {}
    trace_source("a, b = (i for i in range(2))\nc, d = {7, 7}.union({8})\nx, y = 1, 2\nx, y = y, x", namespace=ns)
    assert (ns["a"], ns["b"]) == (0, 1) and sorted([ns["c"], ns["d"]]) == [7, 8] and (ns["x"], ns["y"]) == (2, 1)

def test_unpack_length_mismatch_raises_like_plain_python():
    for src in ("a, b = (1, 2, 3)", "a, b = [1]", "a, b = (i for i in range(3))",
                "arr = [0, 0]\narr[0], arr[1] = (1, 2, 3)", "arr = [0, 0]\narr[0], arr[1] = [1]"):
        plain, traced = _outcome(src, False), _outcome(src, True)
        assert plain[0] is ValueError and traced == plain, (src, plain, traced)

def test_subscript_swap_emits_two_writes_with_crossing_origins():
    events = trace_source("arr = [5, 1]\nif arr[0] > arr[1]:\n    arr[0], arr[1] = arr[1], arr[0]\n")
    writes = [e for e in events if e["kind"] == "write"]
    assert [(w["key"], w["value"]) for w in writes] == [(0, 1), (1, 5)]
    assert writes[0]["container"] == writes[1]["container"]
