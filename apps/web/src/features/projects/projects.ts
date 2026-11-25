/** Guided projects: small real systems built from the structures and lessons. */
export type Project = {
  id: string;
  title: string;
  summary: string;
  level: "beginner" | "intermediate" | "advanced";
  /** Where the ideas come from. */
  uses: readonly { label: string; path: string }[];
  milestones: readonly string[];
  challenges: readonly string[];
  /** A complete, runnable starting point for the playground. */
  code: string;
};

export const PROJECTS: readonly Project[] = [
  {
    id: "autocomplete",
    title: "Search-box autocomplete",
    summary: "Suggest lesson titles as a learner types, ranked by popularity, using a trie.",
    level: "beginner",
    uses: [
      { label: "Trie", path: "/structures/trie" },
      { label: "Binary heap", path: "/structures/binary-heap" },
    ],
    milestones: [
      "Insert words letter by letter",
      "Walk to the node for a prefix",
      "Collect and rank the words below it",
    ],
    challenges: [
      "Return only the top 3 with a heap",
      "Tolerate one typo",
      "Store popularity at each node to skip whole branches",
    ],
    code: `import heapq

class Node:
    def __init__(self):
        self.children, self.score = {}, None   # score set on word ends

class Trie:
    def __init__(self):
        self.root = Node()
    def insert(self, word, score):
        node = self.root
        for ch in word:
            node = node.children.setdefault(ch, Node())
        node.score = score
    def suggest(self, prefix, k=3):
        node = self.root
        for ch in prefix:
            if ch not in node.children:
                return []
            node = node.children[ch]
        found, stack = [], [(node, prefix)]
        while stack:
            n, word = stack.pop()
            if n.score is not None:
                found.append((n.score, word))
            stack.extend((c, word + ch) for ch, c in n.children.items())
        return [w for _, w in heapq.nlargest(k, found)]

t = Trie()
for word, score in [("binary search", 90), ("binary tree", 70), ("bfs", 60),
                    ("bubble sort", 80), ("bloom filter", 40), ("binary heap", 55)]:
    t.insert(word, score)
print(t.suggest("bi"))
print(t.suggest("b", k=5))
`,
  },
  {
    id: "lru",
    title: "An LRU cache from scratch",
    summary:
      "Build the cache in front of a slow database: O(1) get and put, evicting the least recently used.",
    level: "intermediate",
    uses: [
      { label: "LRU cache", path: "/structures/lru-cache" },
      { label: "Caching lesson", path: "/systems/caching" },
    ],
    milestones: [
      "A dict for O(1) lookup",
      "A doubly linked list for recency",
      "Evict from the old end when full",
    ],
    challenges: [
      "Add a TTL per entry",
      "Count hits and misses and print the hit rate",
      "Make get() fall back to a slow 'database' function",
    ],
    code: `class Node:
    def __init__(self, key=None, value=None):
        self.key, self.value, self.prev, self.next = key, value, None, None

class LRUCache:
    def __init__(self, capacity):
        self.cap, self.map = capacity, {}
        self.head, self.tail = Node(), Node()      # sentinels
        self.head.next, self.tail.prev = self.tail, self.head
    def _unlink(self, n):
        n.prev.next, n.next.prev = n.next, n.prev
    def _push_front(self, n):
        n.next, n.prev = self.head.next, self.head
        self.head.next.prev = n
        self.head.next = n
    def get(self, key):
        if key not in self.map:
            return None
        n = self.map[key]
        self._unlink(n); self._push_front(n)
        return n.value
    def put(self, key, value):
        if key in self.map:
            self._unlink(self.map[key])
        n = self.map[key] = Node(key, value)
        self._push_front(n)
        if len(self.map) > self.cap:
            old = self.tail.prev
            self._unlink(old)
            del self.map[old.key]
            print("evicted", old.key)

c = LRUCache(2)
c.put("a", 1); c.put("b", 2)
print(c.get("a"))      # a is now most recent
c.put("c", 3)          # evicts b
print(c.get("b"))
`,
  },
  {
    id: "rate-limiter",
    title: "A token-bucket rate limiter",
    summary:
      "Give each client a budget: bursts allowed, the average rate capped, the rest rejected with 429.",
    level: "intermediate",
    uses: [
      { label: "Rate limiting lesson", path: "/systems/rate-limiting" },
      { label: "Hash table", path: "/structures/hash-table" },
    ],
    milestones: [
      "Refill tokens based on elapsed time",
      "Take one token per request",
      "Keep one bucket per client",
    ],
    challenges: [
      "Add a sliding-window limiter and compare",
      "Return how long to wait (Retry-After)",
      "Simulate 3 clients with different limits",
    ],
    code: `class TokenBucket:
    def __init__(self, capacity, refill_per_sec):
        self.capacity, self.rate = capacity, refill_per_sec
        self.tokens, self.last = capacity, 0.0
    def allow(self, now):
        self.tokens = min(self.capacity, self.tokens + (now - self.last) * self.rate)
        self.last = now
        if self.tokens >= 1:
            self.tokens -= 1
            return True
        return False

buckets = {}
def handle(client, now):
    b = buckets.setdefault(client, TokenBucket(capacity=5, refill_per_sec=2))
    return 200 if b.allow(now) else 429

# a burst of 8 requests at t=0, then one every 0.25 s
times = [0.0] * 8 + [0.25 * i for i in range(1, 9)]
print([handle("script", t) for t in times])
`,
  },
  {
    id: "maze",
    title: "Maze solver",
    summary: "Find the shortest way out of a maze and draw the path, with breadth-first search.",
    level: "beginner",
    uses: [
      { label: "BFS", path: "/algorithms/bfs" },
      { label: "Queue", path: "/structures/queue" },
    ],
    milestones: [
      "Parse the grid",
      "BFS from the start, remembering parents",
      "Walk parents back from the exit and draw the path",
    ],
    challenges: [
      "Count the cells explored",
      "Add weighted cells and switch to Dijkstra",
      "Generate a random maze",
    ],
    code: `from collections import deque

maze = [
    "S..#......",
    ".#.#.####.",
    ".#...#....",
    ".####.#.#.",
    "......#.#E",
]
grid = [list(row) for row in maze]
R, C = len(grid), len(grid[0])
start = next((r, c) for r in range(R) for c in range(C) if grid[r][c] == "S")

parent, queue = {start: None}, deque([start])
while queue:
    r, c = queue.popleft()
    if grid[r][c] == "E":
        break
    for dr, dc in ((0, 1), (1, 0), (0, -1), (-1, 0)):
        n = (r + dr, c + dc)
        if 0 <= n[0] < R and 0 <= n[1] < C and grid[n[0]][n[1]] != "#" and n not in parent:
            parent[n] = (r, c)
            queue.append(n)

step, length = parent[(r, c)], 0
while step and step != start:
    grid[step[0]][step[1]] = "*"
    step, length = parent[step], length + 1
print("\\n".join("".join(row) for row in grid))
print("path length:", length + 1)
`,
  },
  {
    id: "search-engine",
    title: "A tiny search engine",
    summary: "Index lesson texts with an inverted index and rank results by how well they match.",
    level: "intermediate",
    uses: [
      { label: "Hash table", path: "/structures/hash-table" },
      { label: "SQL and NoSQL lesson", path: "/systems/sql-nosql?step=8" },
    ],
    milestones: [
      "Split text into words",
      "Map each word to the documents that contain it",
      "Score documents by matching words (TF-IDF)",
    ],
    challenges: [
      "Ignore common words (the, a, of)",
      "Match 'cache' to 'caches'",
      "Show a snippet around the match",
    ],
    code: `import math, re
from collections import Counter, defaultdict

docs = {
    "caching": "a cache keeps popular answers in memory so the database does less work",
    "cdn": "a cdn keeps copies of static files at the edge close to learners",
    "sharding": "sharding splits data across machines by a shard key",
    "replication": "replication keeps copies of the database on followers for reads",
}
words = lambda text: re.findall(r"[a-z]+", text.lower())
index = defaultdict(dict)                       # word -> {doc: count}
for name, text in docs.items():
    for w, n in Counter(words(text)).items():
        index[w][name] = n

def search(query):
    scores = Counter()
    for w in words(query):
        postings = index.get(w, {})
        idf = math.log(len(docs) / (1 + len(postings))) + 1
        for doc, tf in postings.items():
            scores[doc] += tf * idf
    return scores.most_common(3)

print(search("copies of the database"))
print(search("keep data in memory"))
`,
  },
  {
    id: "hash-ring",
    title: "A consistent-hash ring",
    summary: "Spread keys over servers so that adding one moves only a small share of them.",
    level: "advanced",
    uses: [
      { label: "Consistent hashing lesson", path: "/systems/consistent-hashing" },
      { label: "Binary search", path: "/algorithms/binary-search" },
    ],
    milestones: [
      "Hash servers onto a ring",
      "Find a key's owner with binary search",
      "Measure how many keys move when a server joins",
    ],
    challenges: [
      "Add virtual nodes and compare the balance",
      "Store each key on the next 3 servers",
      "Remove a server and count moves",
    ],
    code: `import bisect, hashlib

def h(text):
    return int(hashlib.md5(text.encode()).hexdigest(), 16) % 2**32

class Ring:
    def __init__(self, servers, vnodes=1):
        self.points = sorted((h(f"{s}#{i}"), s) for s in servers for i in range(vnodes))
        self.hashes = [p for p, _ in self.points]
    def owner(self, key):
        i = bisect.bisect(self.hashes, h(key)) % len(self.points)
        return self.points[i][1]

keys = [f"learner-{i}" for i in range(10_000)]
before = Ring(["A", "B", "C", "D"], vnodes=50)
after = Ring(["A", "B", "C", "D", "E"], vnodes=50)
moved = sum(before.owner(k) != after.owner(k) for k in keys)
print(f"adding E moved {moved / len(keys):.0%} of keys (ideal: 20%)")
print("hash % N would move about", f"{sum(h(k) % 4 != h(k) % 5 for k in keys) / len(keys):.0%}")
`,
  },
  {
    id: "shortener",
    title: "The core of a link shortener",
    summary:
      "Turn ids into short base-62 codes, scramble them so they can't be walked, and redirect.",
    level: "beginner",
    uses: [
      { label: "Link shortener design", path: "/systems/url-shortener" },
      { label: "Hash table", path: "/structures/hash-table" },
    ],
    milestones: [
      "Encode and decode base 62",
      "Scramble ids with a reversible step",
      "Store code → URL and look it up",
    ],
    challenges: [
      "Count clicks per code",
      "Reject URLs on a blocklist",
      "Expire links after a date",
    ],
    code: `ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"
M = 62 ** 7                      # codes up to 7 characters
A = 2_654_435_761                # odd multiplier: a reversible scramble mod M
A_INV = pow(A, -1, M)

def encode(n):
    s = ""
    while n:
        n, r = divmod(n, 62)
        s = ALPHABET[r] + s
    return s or "0"

def decode(s):
    n = 0
    for ch in s:
        n = n * 62 + ALPHABET.index(ch)
    return n

links, next_id = {}, 1
def shorten(url):
    global next_id
    code = encode(next_id * A % M)
    links[code], next_id = url, next_id + 1
    return code

for url in ["/learn/binary-search", "/solutions/42", "/systems/cap"]:
    code = shorten(url)
    print(code, "->", links[code], "| id", decode(code) * A_INV % M)
`,
  },
];
