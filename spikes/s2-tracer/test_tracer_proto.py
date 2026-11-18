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
