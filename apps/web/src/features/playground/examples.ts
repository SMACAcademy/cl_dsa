/** Ready-to-run Python programs for the playground; projects add their own starters. */
export type Example = { id: string; title: string; code: string };

export const EXAMPLES: readonly Example[] = [
  {
    id: "hello",
    title: "Hello, AlgoVerse",
    code: `# Edit me and press Run (or Ctrl+Enter).
name = "AlgoVerse"
for i in range(3):
    print(f"Hello from {name}! #{i + 1}")
`,
  },
  {
    id: "binary-search",
    title: "Binary search",
    code: `def binary_search(items, target):
    lo, hi = 0, len(items) - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        print(f"lo={lo} mid={mid} hi={hi} -> looking at {items[mid]}")
        if items[mid] == target:
            return mid
        if items[mid] < target:
            lo = mid + 1
        else:
            hi = mid - 1
    return -1

print("found at", binary_search([1, 3, 5, 7, 9, 11, 13], 9))
`,
  },
  {
    id: "bubble-sort",
    title: "Bubble sort with a swap counter",
    code: `def bubble_sort(a):
    swaps = 0
    for end in range(len(a) - 1, 0, -1):
        swapped = False
        for j in range(end):
            if a[j] > a[j + 1]:
                a[j], a[j + 1] = a[j + 1], a[j]
                swaps += 1
                swapped = True
        print(a)
        if not swapped:
            break
    return swaps

data = [5, 1, 4, 2, 8]
print("swaps:", bubble_sort(data))
`,
  },
  {
    id: "bfs",
    title: "BFS shortest path on a grid",
    code: `from collections import deque

grid = [
    "S.#.....",
    ".##.###.",
    "....#...",
    ".##...#E",
]

def bfs(grid):
    rows, cols = len(grid), len(grid[0])
    start = next((r, c) for r in range(rows) for c in range(cols) if grid[r][c] == "S")
    queue, seen = deque([(start, 0)]), {start}
    while queue:
        (r, c), d = queue.popleft()
        if grid[r][c] == "E":
            return d
        for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nr, nc = r + dr, c + dc
            if 0 <= nr < rows and 0 <= nc < cols and grid[nr][nc] != "#" and (nr, nc) not in seen:
                seen.add((nr, nc))
                queue.append(((nr, nc), d + 1))
    return -1

print("shortest path length:", bfs(grid))
`,
  },
  {
    id: "fib-memo",
    title: "Fibonacci: naive vs memoized",
    code: `from functools import lru_cache

calls = 0
def fib(n):
    global calls
    calls += 1
    return n if n < 2 else fib(n - 1) + fib(n - 2)

@lru_cache(maxsize=None)
def fib_memo(n):
    return n if n < 2 else fib_memo(n - 1) + fib_memo(n - 2)

print("fib(25) =", fib(25), "with", calls, "calls")
print("fib_memo(90) =", fib_memo(90), "instantly")
`,
  },
  {
    id: "big-o",
    title: "Big-O you can feel: O(n) vs O(log n)",
    code: `import bisect, time

data = list(range(0, 2_000_000, 2))
targets = data[::20_000]

t = time.perf_counter()
found = sum(1 for x in targets if x in data)          # linear scan
linear = time.perf_counter() - t

t = time.perf_counter()
found2 = sum(1 for x in targets if data[bisect.bisect_left(data, x)] == x)  # binary search
binary = time.perf_counter() - t

print(f"{len(targets)} lookups in 1,000,000 items")
print(f"linear: {linear * 1000:.1f} ms, binary: {binary * 1000:.3f} ms")
`,
  },
];
