/**
 * The catalog of every data structure and algorithm AlgoVerse will teach.
 * Each entry says what will be built for it and walks a tiny example by hand
 * (5–8 values at most), so learners and the owner can review the plan before
 * any visualization exists. Content follows docs/CURRICULUM.md; `tile` is the
 * curriculum tile it belongs to.
 */

export type CatalogKind = "algorithm" | "structure" | "system";
export type Level = "beginner" | "intermediate" | "advanced";

export type CatalogItem = {
  id: string;
  kind: CatalogKind;
  name: string;
  group: string;
  level: Level;
  /** Build stage: 1 is built first. */
  stage: 1 | 2 | 3 | 4 | 5;
  /** Curriculum tile code, e.g. "B1.1". */
  tile: string;
  summary: string;
  /** What the learner will see and do in the visualization. */
  visual: string[];
  example: { input: string; steps: string[]; result: string };
  cost: { label: string; value: string }[];
  /** Ids of catalog items this one builds on. */
  buildsOn?: string[];
};

type Entry = Omit<CatalogItem, "kind">;

const STRUCTURE_ENTRIES: Entry[] = [
  // ---------- Linear ----------
  {
    id: "array",
    name: "Array",
    group: "Linear structures",
    level: "beginner",
    stage: 1,
    tile: "D1.2",
    summary:
      "A row of equal-sized boxes side by side in memory. Any box can be reached instantly by its index.",
    visual: [
      "Boxes with their index and memory address underneath",
      "Reading a[i] highlights the address calculation base + i × size",
      "Inserting in the middle animates every later value shifting one place right",
    ],
    example: {
      input: "a = [7, 3, 9, 4]",
      steps: [
        "Read a[2]: jump straight to box 2 → 9 (no scanning)",
        "Insert 5 at index 1: shift 4, then 9, then 3 one place right",
        "Write 5 into the free box 1",
      ],
      result: "[7, 5, 3, 9, 4]",
    },
    cost: [
      { label: "Read / write by index", value: "O(1)" },
      { label: "Search for a value", value: "O(n)" },
      { label: "Insert / delete in the middle", value: "O(n)" },
    ],
  },
  {
    id: "dynamic-array",
    name: "Dynamic array (Python list)",
    group: "Linear structures",
    level: "beginner",
    stage: 1,
    tile: "D2.0",
    summary:
      "An array that grows itself: when it is full it moves into a bigger block, usually double the size.",
    visual: [
      "Used slots and spare capacity drawn differently",
      "A full array visibly copies into a block twice as large",
      "A running counter shows why appends are cheap on average",
    ],
    example: {
      input: "Empty list with capacity 2; append 1, 2, 3",
      steps: [
        "Append 1 → [1, _]",
        "Append 2 → [1, 2] (now full)",
        "Append 3: allocate capacity 4, copy 1 and 2 across",
        "Write 3 → [1, 2, 3, _]",
      ],
      result: "[1, 2, 3] with capacity 4",
    },
    cost: [
      { label: "Append (on average)", value: "O(1) amortized" },
      { label: "Append that triggers a resize", value: "O(n)" },
      { label: "Read by index", value: "O(1)" },
    ],
    buildsOn: ["array"],
  },
  {
    id: "singly-linked-list",
    name: "Singly linked list",
    group: "Linear structures",
    level: "beginner",
    stage: 2,
    tile: "D2.0",
    summary:
      "A chain of nodes, each holding a value and an arrow to the next node. Inserting is just re-pointing arrows.",
    visual: [
      "Nodes as boxes with arrows; the head pointer is labelled",
      "Re-pointing an arrow animates as the arrow swinging to its new target",
      "Lost nodes fade out so you can see a broken link immediately",
    ],
    example: {
      input: "3 → 8 → 5",
      steps: [
        "Insert 4 after 3: create node 4 and point it at 8",
        "Point 3 at 4 → 3 → 4 → 8 → 5",
        "Delete 8: point 4 straight at 5",
      ],
      result: "3 → 4 → 5",
    },
    cost: [
      { label: "Insert / delete at a known node", value: "O(1)" },
      { label: "Find the i-th element", value: "O(n)" },
      { label: "Search for a value", value: "O(n)" },
    ],
  },
  {
    id: "doubly-linked-list",
    name: "Doubly linked list",
    group: "Linear structures",
    level: "intermediate",
    stage: 2,
    tile: "D2.0",
    summary: "Like a linked list, but each node also points back to the previous node.",
    visual: [
      "Forward and backward arrows in two colours",
      "Deleting a node shows both neighbours being re-linked",
    ],
    example: {
      input: "2 ⇄ 6 ⇄ 9",
      steps: ["Delete 6: point 2.next at 9", "Point 9.prev at 2"],
      result: "2 ⇄ 9",
    },
    cost: [
      { label: "Insert / delete at a known node", value: "O(1)" },
      { label: "Walk forwards or backwards", value: "O(n)" },
    ],
    buildsOn: ["singly-linked-list"],
  },
  {
    id: "stack",
    name: "Stack",
    group: "Linear structures",
    level: "beginner",
    stage: 2,
    tile: "D2.0",
    summary: "Last in, first out: like a pile of plates, you only touch the top.",
    visual: [
      "A vertical pile with the top marked",
      "Push drops a plate on, pop lifts it off",
      "The same picture is reused for the function call stack",
    ],
    example: {
      input: "Empty stack",
      steps: ["push 4", "push 7", "push 1 → top is 1", "pop → returns 1", "peek → 7"],
      result: "Stack holds [4, 7], top 7",
    },
    cost: [{ label: "push / pop / peek", value: "O(1)" }],
    buildsOn: ["dynamic-array"],
  },
  {
    id: "queue",
    name: "Queue",
    group: "Linear structures",
    level: "beginner",
    stage: 2,
    tile: "D2.0",
    summary: "First in, first out: like a line at a ticket counter.",
    visual: [
      "A horizontal line with front and back marked",
      "Values enter at the back and leave from the front",
    ],
    example: {
      input: "Empty queue",
      steps: ["enqueue A, B, C", "dequeue → A leaves first", "front is now B"],
      result: "Queue holds [B, C]",
    },
    cost: [{ label: "enqueue / dequeue", value: "O(1)" }],
  },
  {
    id: "circular-queue",
    name: "Circular queue (ring buffer)",
    group: "Linear structures",
    level: "intermediate",
    stage: 2,
    tile: "D2.0",
    summary: "A fixed-size queue whose end wraps around to the start, so no space is wasted.",
    visual: [
      "Slots drawn in a ring with head and tail pointers",
      "The tail pointer visibly wraps from the last slot back to slot 0",
    ],
    example: {
      input: "Capacity 4",
      steps: [
        "enqueue 1, 2, 3 → slots [1, 2, 3, _], head 0",
        "dequeue → 1, head moves to 1",
        "enqueue 4 → slot 3",
        "enqueue 5 → tail wraps to slot 0 → slots [5, 2, 3, 4]",
      ],
      result: "Queue order from head: 2, 3, 4, 5 (full)",
    },
    cost: [{ label: "enqueue / dequeue", value: "O(1)" }],
    buildsOn: ["queue", "array"],
  },
  {
    id: "deque",
    name: "Deque (double-ended queue)",
    group: "Linear structures",
    level: "intermediate",
    stage: 2,
    tile: "D2.0",
    summary: "A queue you can add to and remove from at both ends.",
    visual: ["A line with both ends active", "Python's collections.deque shown side by side"],
    example: {
      input: "Empty deque",
      steps: [
        "push_back 2",
        "push_front 1",
        "push_back 3 → [1, 2, 3]",
        "pop_front → 1",
        "pop_back → 3",
      ],
      result: "[2]",
    },
    cost: [{ label: "Add / remove at either end", value: "O(1)" }],
    buildsOn: ["queue"],
  },
  // ---------- Hashing ----------
  {
    id: "hash-table",
    name: "Hash table (chaining)",
    group: "Hashing",
    level: "intermediate",
    stage: 3,
    tile: "D3.2",
    summary:
      "Turns a key into a bucket number with a hash function, so lookups jump straight to the right bucket.",
    visual: [
      "Buckets in a column; the hash calculation shown for each key",
      "Collisions grow a small chain inside a bucket",
      "A load-factor meter that triggers resizing",
    ],
    example: {
      input: "5 buckets, hash(k) = k mod 5",
      steps: [
        "insert 12 → 12 mod 5 = 2 → bucket 2",
        "insert 7 → 7 mod 5 = 2 → collision, chain 12 → 7",
        "insert 9 → bucket 4",
        "lookup 7 → go to bucket 2, scan the chain, found",
      ],
      result: "Bucket 2: [12, 7], bucket 4: [9]",
    },
    cost: [
      { label: "Insert / lookup / delete (average)", value: "O(1)" },
      { label: "Worst case (everything collides)", value: "O(n)" },
    ],
    buildsOn: ["array", "singly-linked-list"],
  },
  {
    id: "open-addressing",
    name: "Hash table (open addressing)",
    group: "Hashing",
    level: "intermediate",
    stage: 3,
    tile: "D3.2",
    summary: "On a collision, instead of chaining, step to the next free slot in the same array.",
    visual: ["Probe steps drawn as hops along the array", "Clusters of filled slots highlighted"],
    example: {
      input: "5 slots, hash(k) = k mod 5, linear probing",
      steps: [
        "insert 10 → slot 0",
        "insert 15 → slot 0 taken, probe slot 1 → store",
        "insert 21 → slot 1 taken, probe slot 2 → store",
        "lookup 15 → slot 0 (10, no), slot 1 (15, yes)",
      ],
      result: "[10, 15, 21, _, _]",
    },
    cost: [
      { label: "Average, low load factor", value: "O(1)" },
      { label: "Worst case", value: "O(n)" },
    ],
    buildsOn: ["hash-table"],
  },
  {
    id: "hash-set",
    name: "Hash set",
    group: "Hashing",
    level: "beginner",
    stage: 3,
    tile: "D3.2",
    summary: "A hash table that stores only keys, so it remembers whether something has been seen.",
    visual: [
      "Duplicates bounce off instead of being added",
      "Membership checks light up one bucket",
    ],
    example: {
      input: "Empty set",
      steps: [
        'add "a"',
        'add "b"',
        'add "a" again → already there, ignored',
        'contains "b" → True',
      ],
      result: '{"a", "b"}',
    },
    cost: [{ label: "add / contains / remove (average)", value: "O(1)" }],
    buildsOn: ["hash-table"],
  },
  // ---------- Trees ----------
  {
    id: "binary-tree",
    name: "Binary tree & traversals",
    group: "Trees",
    level: "intermediate",
    stage: 3,
    tile: "D3.0",
    summary:
      "Each node has up to two children. Traversals are the different orders in which to visit every node.",
    visual: [
      "The tree drawn top-down with a moving visit marker",
      "The output sequence builds up beside the tree",
      "Pre-, in-, post- and level-order compared on the same tree",
    ],
    example: {
      input: "Root 1; children 2 and 3; node 2 has children 4 and 5",
      steps: [
        "Pre-order (node, left, right): 1, 2, 4, 5, 3",
        "In-order (left, node, right): 4, 2, 5, 1, 3",
        "Post-order (left, right, node): 4, 5, 2, 3, 1",
        "Level-order (row by row): 1, 2, 3, 4, 5",
      ],
      result: "Four different visit orders of the same 5 nodes",
    },
    cost: [{ label: "Any full traversal", value: "O(n)" }],
  },
  {
    id: "binary-search-tree",
    name: "Binary search tree",
    group: "Trees",
    level: "intermediate",
    stage: 3,
    tile: "D3.0",
    summary: "A binary tree kept in order: smaller keys go left, larger keys go right.",
    visual: [
      "Each comparison highlights the branch taken",
      "Inserting sorted data shows the tree degrading into a chain",
    ],
    example: {
      input: "Insert 8, 3, 10, 1, 6",
      steps: [
        "8 becomes the root",
        "3 < 8 → left of 8; 10 > 8 → right of 8",
        "1 < 8, 1 < 3 → left of 3; 6 < 8, 6 > 3 → right of 3",
        "Search 6: 8 → go left → 3 → go right → 6 found (3 comparisons)",
      ],
      result: "A tree of height 3",
    },
    cost: [
      { label: "Search / insert (balanced)", value: "O(log n)" },
      { label: "Search / insert (degenerate chain)", value: "O(n)" },
    ],
    buildsOn: ["binary-tree"],
  },
  {
    id: "avl-tree",
    name: "AVL tree (self-balancing)",
    group: "Trees",
    level: "advanced",
    stage: 5,
    tile: "D4.2",
    summary:
      "A binary search tree that rotates itself after each insert so it never gets lopsided.",
    visual: ["Balance factors shown on every node", "Rotations animate nodes swinging into place"],
    example: {
      input: "Insert 1, 2, 3",
      steps: [
        "After 1 and 2, the tree leans right (1 → 2)",
        "Insert 3: node 1 has balance −2, too right-heavy",
        "Rotate left at 1: 2 becomes the root with children 1 and 3",
      ],
      result: "Balanced tree: 2 with children 1 and 3",
    },
    cost: [{ label: "Search / insert / delete", value: "O(log n), guaranteed" }],
    buildsOn: ["binary-search-tree"],
  },
  {
    id: "binary-heap",
    name: "Binary heap (priority queue)",
    group: "Trees",
    level: "intermediate",
    stage: 3,
    tile: "D3.0",
    summary:
      "A complete binary tree stored in an array where every parent is smaller than its children, so the minimum is always on top.",
    visual: [
      "Tree view and array view kept in sync",
      "Sift-up and sift-down shown as swaps along one path",
    ],
    example: {
      input: "Min-heap: insert 5, 3, 8, 1",
      steps: [
        "Insert 5 → [5]; insert 3 → swap up → [3, 5]",
        "Insert 8 → [3, 5, 8]",
        "Insert 1 → [3, 5, 8, 1] → swap with 5 → [3, 1, 8, 5] → swap with 3 → [1, 3, 8, 5]",
        "Extract min → 1; move 5 to the top and sift down → [3, 5, 8]",
      ],
      result: "Minimum 1 removed; heap [3, 5, 8]",
    },
    cost: [
      { label: "Peek at the minimum", value: "O(1)" },
      { label: "Insert / extract", value: "O(log n)" },
      { label: "Build from n values", value: "O(n)" },
    ],
    buildsOn: ["binary-tree", "array"],
  },
  {
    id: "trie",
    name: "Trie (prefix tree)",
    group: "Trees",
    level: "intermediate",
    stage: 4,
    tile: "D4.2",
    summary: "Stores words letter by letter, so words that share a prefix share a path.",
    visual: [
      "Letters on the edges; end-of-word nodes marked",
      "Autocomplete highlights every word under a prefix",
    ],
    example: {
      input: 'Insert "car", "cat", "dog"',
      steps: [
        'c → a → r (end of "car")',
        '"cat" reuses c → a and adds t',
        "d → o → g starts a new branch",
        'Prefix "ca" → words: car, cat',
      ],
      result: "3 words, 7 letter nodes",
    },
    cost: [{ label: "Insert / search a word of length L", value: "O(L)" }],
    buildsOn: ["binary-tree"],
  },
  {
    id: "segment-tree",
    name: "Segment tree",
    group: "Trees",
    level: "advanced",
    stage: 5,
    tile: "D4.2",
    summary: 'A tree of range totals that answers "sum from i to j" and handles updates quickly.',
    visual: [
      "The array along the bottom, range totals above",
      "A query lights up only the nodes it needs",
    ],
    example: {
      input: "[2, 1, 5, 3]",
      steps: [
        "Leaves 2, 1, 5, 3; parents 2+1 = 3 and 5+3 = 8; root 11",
        "Sum of index 1..2 → combine leaf 1 and leaf 2 → 1 + 5 = 6",
        "Set index 2 to 4 → update 5→4, 8→7, 11→10",
      ],
      result: "Root total 10 after the update",
    },
    cost: [{ label: "Range query / point update", value: "O(log n)" }],
    buildsOn: ["binary-tree"],
  },
  // ---------- Graphs & sets ----------
  {
    id: "graph",
    name: "Graph (adjacency list & matrix)",
    group: "Graphs & sets",
    level: "intermediate",
    stage: 4,
    tile: "D4.0",
    summary:
      "Points (vertices) joined by lines (edges). Stored either as neighbour lists or as a grid of yes/no.",
    visual: [
      "The drawing, the list and the matrix side by side",
      "Adding an edge updates all three views",
    ],
    example: {
      input: "Edges A–B, A–C, B–D",
      steps: [
        "Adjacency list: A: [B, C], B: [A, D], C: [A], D: [B]",
        "Adjacency matrix: a 4 × 4 grid with 1 where an edge exists",
        "Is B–D an edge? Matrix: one lookup. List: scan B's neighbours",
      ],
      result: "Same graph, two representations",
    },
    cost: [
      { label: "Space (list / matrix)", value: "O(V + E) / O(V²)" },
      { label: "Edge check (list / matrix)", value: "O(degree) / O(1)" },
    ],
  },
  {
    id: "union-find",
    name: "Union–Find (disjoint sets)",
    group: "Graphs & sets",
    level: "advanced",
    stage: 4,
    tile: "D5.2",
    summary:
      "Keeps track of which items are in the same group, and merges groups almost instantly.",
    visual: [
      "Each group drawn as a small tree with its root on top",
      "Path compression flattens the tree as you watch",
    ],
    example: {
      input: "Items 0, 1, 2, 3, 4, each in its own group",
      steps: [
        "union(0, 1) → {0, 1}",
        "union(3, 4) → {3, 4}",
        "union(1, 4) → {0, 1, 3, 4}",
        "find(3) == find(0)? yes; 2 is still alone",
      ],
      result: "Groups {0, 1, 3, 4} and {2}",
    },
    cost: [{ label: "union / find", value: "≈ O(1) amortized (with rank + path compression)" }],
  },
  // ---------- Designed structures ----------
  {
    id: "lru-cache",
    name: "LRU cache",
    group: "Designed structures",
    level: "advanced",
    stage: 4,
    tile: "B3.1",
    summary:
      "A fixed-size cache that forgets the least recently used item first. Built from a hash map plus a doubly linked list.",
    visual: [
      "The recency list and the hash map shown together",
      "The evicted item slides out of the old end",
    ],
    example: {
      input: "Capacity 2",
      steps: [
        "put(a, 1), put(b, 2)",
        "get(a) → 1; a becomes most recent",
        "put(c, 3) → full, evict b (least recent)",
        "get(b) → miss",
      ],
      result: "Cache holds a and c",
    },
    cost: [{ label: "get / put", value: "O(1)" }],
    buildsOn: ["hash-table", "doubly-linked-list"],
  },
  {
    id: "bloom-filter",
    name: "Bloom filter",
    group: "Designed structures",
    level: "advanced",
    stage: 5,
    tile: "D6.2",
    summary:
      'A tiny bit array that answers "definitely not" or "maybe". It trades a few false alarms for very little memory.',
    visual: [
      "Each hash lights up one bit",
      "A false positive is shown as all bits lit by other words",
    ],
    example: {
      input: "8 bits, 2 pretend hash functions",
      steps: [
        'add "cat" → sets bits 0 and 1',
        'add "dog" → sets bits 2 and 7',
        'query "bat" → bits 7 and 0 → both set → "maybe" (a false positive)',
        'query "cow" → bits 1 and 6 → bit 6 is 0 → "definitely not"',
      ],
      result: "No false negatives, occasional false positives",
    },
    cost: [{ label: "add / query", value: "O(k) for k hash functions" }],
    buildsOn: ["hash-set"],
  },
];

const ALGORITHM_ENTRIES: Entry[] = [
  // ---------- Searching ----------
  {
    id: "linear-search",
    name: "Linear search",
    group: "Searching",
    level: "beginner",
    stage: 1,
    tile: "B1.1",
    summary: "Check each value from left to right until you find the target.",
    visual: ["A pointer walks the array", "Each comparison is counted"],
    example: {
      input: "[4, 8, 1, 9], target 1",
      steps: ["4 ≠ 1", "8 ≠ 1", "1 = 1 → found"],
      result: "Index 2, after 3 comparisons",
    },
    cost: [
      { label: "Best case", value: "O(1)" },
      { label: "Worst case", value: "O(n)" },
    ],
    buildsOn: ["array"],
  },
  {
    id: "binary-search",
    name: "Binary search",
    group: "Searching",
    level: "beginner",
    stage: 1,
    tile: "B1.1",
    summary:
      "On a sorted array, look at the middle and throw away the half that cannot hold the target.",
    visual: [
      "lo, mid and hi markers move on the array",
      "The discarded half greys out each step",
      "Predict which way mid moves next",
    ],
    example: {
      input: "[1, 3, 5, 7, 9, 11], target 7",
      steps: [
        "lo 0, hi 5, mid 2 → 5 < 7 → search right, lo = 3",
        "lo 3, hi 5, mid 4 → 9 > 7 → search left, hi = 3",
        "lo 3, hi 3, mid 3 → 7 = 7 → found",
      ],
      result: "Index 3, after 3 comparisons",
    },
    cost: [
      { label: "Time", value: "O(log n)" },
      { label: "Needs", value: "Sorted input" },
    ],
    buildsOn: ["array"],
  },
  // ---------- Sorting ----------
  {
    id: "bubble-sort",
    name: "Bubble sort",
    group: "Sorting",
    level: "beginner",
    stage: 1,
    tile: "B1.1",
    summary:
      "Repeatedly swap neighbours that are out of order. The largest value bubbles to the end each pass.",
    visual: [
      "Bars swap places with an animation",
      "The sorted tail is marked",
      "Comparison and swap counters",
    ],
    example: {
      input: "[5, 1, 4, 2]",
      steps: [
        "Pass 1: swap 5,1 → swap 5,4 → swap 5,2 → [1, 4, 2, 5]",
        "Pass 2: 1,4 ok → swap 4,2 → [1, 2, 4, 5]",
        "Pass 3: no swaps → stop early",
      ],
      result: "[1, 2, 4, 5]",
    },
    cost: [
      { label: "Worst / average", value: "O(n²)" },
      { label: "Best (already sorted, early exit)", value: "O(n)" },
    ],
    buildsOn: ["array"],
  },
  {
    id: "selection-sort",
    name: "Selection sort",
    group: "Sorting",
    level: "beginner",
    stage: 1,
    tile: "B1.1",
    summary: "Find the smallest remaining value and put it next in line.",
    visual: ["The current minimum is highlighted while scanning", "One swap per pass"],
    example: {
      input: "[3, 1, 4, 2]",
      steps: [
        "Smallest of all is 1 → swap into place → [1, 3, 4, 2]",
        "Smallest of the rest is 2 → [1, 2, 4, 3]",
        "Smallest of the rest is 3 → [1, 2, 3, 4]",
      ],
      result: "[1, 2, 3, 4]",
    },
    cost: [{ label: "Every case", value: "O(n²) comparisons, O(n) swaps" }],
    buildsOn: ["array"],
  },
  {
    id: "insertion-sort",
    name: "Insertion sort",
    group: "Sorting",
    level: "beginner",
    stage: 1,
    tile: "B1.1",
    summary:
      "Take the next value and slide it left into its place among the already-sorted values, like sorting cards in your hand.",
    visual: ["The value being inserted lifts out", "Larger values shift right to make room"],
    example: {
      input: "[4, 1, 3, 2]",
      steps: [
        "Insert 1 → shift 4 → [1, 4, 3, 2]",
        "Insert 3 → shift 4 → [1, 3, 4, 2]",
        "Insert 2 → shift 4, 3 → [1, 2, 3, 4]",
      ],
      result: "[1, 2, 3, 4]",
    },
    cost: [
      { label: "Worst / average", value: "O(n²)" },
      { label: "Nearly sorted input", value: "O(n)" },
    ],
    buildsOn: ["array"],
  },
  {
    id: "merge-sort",
    name: "Merge sort",
    group: "Sorting",
    level: "intermediate",
    stage: 2,
    tile: "D2.2",
    summary: "Split the list in half, sort each half, then merge the two sorted halves.",
    visual: ["A recursion tree of splits", "Merging shown as two fingers walking two lists"],
    example: {
      input: "[6, 2, 5, 1]",
      steps: ["Split → [6, 2] and [5, 1]", "Sort halves → [2, 6] and [1, 5]", "Merge: 1, 2, 5, 6"],
      result: "[1, 2, 5, 6]",
    },
    cost: [
      { label: "Every case", value: "O(n log n)" },
      { label: "Extra space", value: "O(n)" },
    ],
    buildsOn: ["recursion"],
  },
  {
    id: "quick-sort",
    name: "Quick sort",
    group: "Sorting",
    level: "intermediate",
    stage: 2,
    tile: "D2.2",
    summary: "Pick a pivot, move smaller values left and larger values right, then sort each side.",
    visual: ["The pivot is marked", "The partition boundary moves as values are swapped"],
    example: {
      input: "[3, 6, 1, 5, 2], pivot = last value",
      steps: [
        "Pivot 2: only 1 is smaller → [1, 2, 3, 5, 6], 2 is in its final place",
        "Left side [1] is done",
        "Right side [3, 5, 6]: pivot 6, then pivot 5 → already in order",
      ],
      result: "[1, 2, 3, 5, 6]",
    },
    cost: [
      { label: "Average", value: "O(n log n)" },
      { label: "Worst (bad pivots)", value: "O(n²)" },
    ],
    buildsOn: ["recursion"],
  },
  {
    id: "heap-sort",
    name: "Heap sort",
    group: "Sorting",
    level: "intermediate",
    stage: 3,
    tile: "D3.0",
    summary: "Build a max-heap, then repeatedly move the largest value to the end.",
    visual: ["Heap tree and array in sync", "The sorted tail grows from the right"],
    example: {
      input: "[4, 1, 3]",
      steps: [
        "Max-heap already: 4 is above 1 and 3",
        "Swap 4 to the end → [3, 1, 4]; 3 stays on top",
        "Swap 3 to position 1 → [1, 3, 4]",
      ],
      result: "[1, 3, 4]",
    },
    cost: [
      { label: "Every case", value: "O(n log n)" },
      { label: "Extra space", value: "O(1)" },
    ],
    buildsOn: ["binary-heap"],
  },
  {
    id: "counting-sort",
    name: "Counting sort",
    group: "Sorting",
    level: "intermediate",
    stage: 3,
    tile: "B3.3",
    summary:
      "For small whole-number keys, count how many of each there are, then write them out in order.",
    visual: ["A tally row of counts", "Output written from the tallies"],
    example: {
      input: "[2, 0, 2, 1], keys 0..2",
      steps: ["Count: 0 → 1, 1 → 1, 2 → 2", "Write one 0, one 1, two 2s"],
      result: "[0, 1, 2, 2]",
    },
    cost: [{ label: "Time", value: "O(n + k) for keys 0..k" }],
    buildsOn: ["array"],
  },
  {
    id: "radix-sort",
    name: "Radix sort",
    group: "Sorting",
    level: "advanced",
    stage: 4,
    tile: "B3.3",
    summary:
      "Sort by the last digit, then the next digit, and so on. Each pass must keep ties in order.",
    visual: ["Digit buckets 0–9", "Numbers drop into buckets and are collected again"],
    example: {
      input: "[21, 13, 32, 12]",
      steps: ["By ones digit: 21, 32, 12, 13", "By tens digit: 12, 13, 21, 32"],
      result: "[12, 13, 21, 32]",
    },
    cost: [{ label: "Time", value: "O(d · (n + b)) for d digits in base b" }],
    buildsOn: ["counting-sort"],
  },
  // ---------- Recursion ----------
  {
    id: "recursion",
    name: "Recursion & the call stack",
    group: "Recursion & divide and conquer",
    level: "beginner",
    stage: 2,
    tile: "B2.1",
    summary: "A function that solves a problem by calling itself on a smaller version of it.",
    visual: ["Each call stacks a frame with its own variables", "Frames return and pop one by one"],
    example: {
      input: "factorial(3)",
      steps: [
        "factorial(3) waits for factorial(2)",
        "factorial(2) waits for factorial(1) = 1 (base case)",
        "Unwind: 2 × 1 = 2, then 3 × 2 = 6",
      ],
      result: "6, with at most 3 frames on the stack",
    },
    cost: [{ label: "factorial(n)", value: "O(n) time, O(n) stack" }],
    buildsOn: ["stack"],
  },
  {
    id: "tower-of-hanoi",
    name: "Tower of Hanoi",
    group: "Recursion & divide and conquer",
    level: "intermediate",
    stage: 2,
    tile: "D2.2",
    summary: "Move a stack of disks between three pegs, never putting a big disk on a small one.",
    visual: ["Disks move between pegs", "The recursion tree grows beside the pegs"],
    example: {
      input: "2 disks on peg A",
      steps: ["Small disk A → B", "Big disk A → C", "Small disk B → C"],
      result: "3 moves (2² − 1)",
    },
    cost: [{ label: "Moves for n disks", value: "2ⁿ − 1, so O(2ⁿ)" }],
    buildsOn: ["recursion"],
  },
  // ---------- Patterns ----------
  {
    id: "two-pointers",
    name: "Two pointers",
    group: "Problem-solving patterns",
    level: "intermediate",
    stage: 3,
    tile: "D3.6",
    summary: "Move two markers towards each other to avoid checking every pair.",
    visual: ["Left and right markers on the array", "The running sum compared with the target"],
    example: {
      input: "Sorted [1, 2, 4, 7, 11], find a pair summing to 9",
      steps: [
        "1 + 11 = 12 > 9 → move right in",
        "1 + 7 = 8 < 9 → move left in",
        "2 + 7 = 9 → found",
      ],
      result: "Pair (2, 7)",
    },
    cost: [{ label: "Time", value: "O(n) instead of O(n²)" }],
    buildsOn: ["array"],
  },
  {
    id: "sliding-window",
    name: "Sliding window",
    group: "Problem-solving patterns",
    level: "intermediate",
    stage: 3,
    tile: "D3.6",
    summary:
      "Keep a running total over a window and slide it: add the new value, drop the old one.",
    visual: [
      "A highlighted window glides along the array",
      "Values entering and leaving are marked",
    ],
    example: {
      input: "[2, 1, 5, 1, 3], best sum of 3 in a row",
      steps: [
        "Window [2, 1, 5] = 8",
        "Slide: −2 +1 → [1, 5, 1] = 7",
        "Slide: −1 +3 → [5, 1, 3] = 9",
      ],
      result: "Maximum 9",
    },
    cost: [{ label: "Time", value: "O(n)" }],
    buildsOn: ["array"],
  },
  {
    id: "prefix-sums",
    name: "Prefix sums",
    group: "Problem-solving patterns",
    level: "beginner",
    stage: 3,
    tile: "D3.6",
    summary: "Precompute running totals once, and every range sum becomes a single subtraction.",
    visual: ["The running-total row under the array", "A range query shown as two lookups"],
    example: {
      input: "[3, 1, 4, 1]",
      steps: ["Running totals P = [0, 3, 4, 8, 9]", "Sum of index 1..2 = P[3] − P[1] = 8 − 3 = 5"],
      result: "5 (that is 1 + 4)",
    },
    cost: [
      { label: "Build", value: "O(n)" },
      { label: "Each range query", value: "O(1)" },
    ],
    buildsOn: ["array"],
  },
  // ---------- Graphs ----------
  {
    id: "bfs",
    name: "Breadth-first search (BFS)",
    group: "Graph algorithms",
    level: "intermediate",
    stage: 4,
    tile: "D4.0",
    summary: "Explore a graph ring by ring, nearest vertices first, using a queue.",
    visual: ["Vertices coloured unvisited / queued / done", "The queue shown below the graph"],
    example: {
      input: "Edges A–B, A–C, B–D, C–D; start at A",
      steps: ["Visit A; queue B, C", "Visit B; queue D", "Visit C (D already queued)", "Visit D"],
      result: "Order A, B, C, D",
    },
    cost: [{ label: "Time", value: "O(V + E)" }],
    buildsOn: ["graph", "queue"],
  },
  {
    id: "dfs",
    name: "Depth-first search (DFS)",
    group: "Graph algorithms",
    level: "intermediate",
    stage: 4,
    tile: "D4.0",
    summary:
      "Go as deep as possible along one path before backing up, using a stack (or recursion).",
    visual: ["The current path highlighted", "Backtracking shown as the path shrinking"],
    example: {
      input: "Same graph, neighbours in alphabetical order; start at A",
      steps: ["A → B", "B → D", "D → C", "C has no new neighbours → back up"],
      result: "Order A, B, D, C",
    },
    cost: [{ label: "Time", value: "O(V + E)" }],
    buildsOn: ["graph", "stack"],
  },
  {
    id: "topological-sort",
    name: "Topological sort",
    group: "Graph algorithms",
    level: "intermediate",
    stage: 4,
    tile: "D4.0",
    summary: "Order tasks so every task comes after the tasks it depends on.",
    visual: ["In-degree counts on each vertex", "Ready tasks enter a queue"],
    example: {
      input: "wake → dress, wake → eat, dress → leave, eat → leave",
      steps: [
        "Only wake has no prerequisites → output wake",
        "dress and eat become ready → output dress, eat",
        "leave becomes ready → output leave",
      ],
      result: "wake, dress, eat, leave",
    },
    cost: [{ label: "Time", value: "O(V + E)" }],
    buildsOn: ["bfs"],
  },
  {
    id: "dijkstra",
    name: "Dijkstra's shortest paths",
    group: "Graph algorithms",
    level: "advanced",
    stage: 4,
    tile: "D5.0",
    summary:
      "Find the cheapest route from a start to every vertex, always settling the closest one next.",
    visual: ["Tentative distances on each vertex", "Edges relax and distances drop"],
    example: {
      input: "A–B 4, A–C 1, C–B 2, B–D 1; start at A",
      steps: [
        "Settle A (0): C = 1, B = 4",
        "Settle C (1): B via C = 3 < 4 → B = 3",
        "Settle B (3): D = 4",
        "Settle D (4)",
      ],
      result: "A 0, C 1, B 3, D 4",
    },
    cost: [{ label: "With a binary heap", value: "O((V + E) log V)" }],
    buildsOn: ["graph", "binary-heap"],
  },
  {
    id: "kruskal",
    name: "Kruskal's minimum spanning tree",
    group: "Graph algorithms",
    level: "advanced",
    stage: 4,
    tile: "D5.0",
    summary:
      "Connect every vertex as cheaply as possible: take edges cheapest first, skipping any that would make a loop.",
    visual: ["Edges sorted in a list beside the graph", "Rejected edges flash red"],
    example: {
      input: "A–B 1, B–C 2, A–C 3, C–D 4",
      steps: [
        "Take A–B (1)",
        "Take B–C (2)",
        "Skip A–C (3): it would close a loop",
        "Take C–D (4)",
      ],
      result: "Total weight 7",
    },
    cost: [{ label: "Time", value: "O(E log E)" }],
    buildsOn: ["graph", "union-find"],
  },
  // ---------- Greedy ----------
  {
    id: "activity-selection",
    name: "Activity selection",
    group: "Greedy algorithms",
    level: "intermediate",
    stage: 4,
    tile: "D4.6",
    summary: "Fit the most meetings into one room by always picking the one that ends earliest.",
    visual: ["Meetings as bars on a timeline", "Chosen bars lock in, clashing bars fade"],
    example: {
      input: "Meetings 1–3, 2–5, 4–6, 6–8 (sorted by end time)",
      steps: ["Take 1–3", "Skip 2–5 (overlaps)", "Take 4–6", "Take 6–8"],
      result: "3 meetings",
    },
    cost: [{ label: "Time", value: "O(n log n) for the sort" }],
  },
  {
    id: "huffman-coding",
    name: "Huffman coding",
    group: "Greedy algorithms",
    level: "advanced",
    stage: 5,
    tile: "D4.6",
    summary:
      "Give frequent letters short codes and rare letters long codes by always merging the two rarest.",
    visual: ["A priority queue of subtrees", "Merges build the code tree from the bottom"],
    example: {
      input: "Frequencies a: 5, b: 2, c: 1",
      steps: [
        "Merge c (1) + b (2) → 3",
        "Merge 3 + a (5) → 8",
        "Read codes from the tree: a = 0, b = 10, c = 11",
      ],
      result: "a gets 1 bit, b and c get 2 bits",
    },
    cost: [{ label: "Time", value: "O(n log n)" }],
    buildsOn: ["binary-heap"],
  },
  // ---------- Dynamic programming ----------
  {
    id: "fibonacci-memo",
    name: "Fibonacci with memoization",
    group: "Dynamic programming",
    level: "beginner",
    stage: 4,
    tile: "D4.8",
    summary:
      "Remember answers you have already computed so the same subproblem is never solved twice.",
    visual: [
      "The naive call tree with repeated calls highlighted",
      "The memo table filling in once",
    ],
    example: {
      input: "fib(5)",
      steps: [
        "Naive: fib(3) is computed twice, fib(2) three times",
        "Memo: fill 0, 1, 1, 2, 3, 5 once each",
      ],
      result: "fib(5) = 5",
    },
    cost: [
      { label: "Naive", value: "O(2ⁿ)" },
      { label: "Memoized", value: "O(n)" },
    ],
    buildsOn: ["recursion"],
  },
  {
    id: "coin-change",
    name: "Coin change (fewest coins)",
    group: "Dynamic programming",
    level: "intermediate",
    stage: 4,
    tile: "D4.8",
    summary: "The fewest coins that make an amount. A neat case where the greedy choice is wrong.",
    visual: ["A table of best answers from 0 up to the amount", "Greedy and DP answers compared"],
    example: {
      input: "Coins {1, 3, 4}, amount 6",
      steps: [
        "Greedy takes 4 + 1 + 1 = 3 coins",
        "Table best[0..6] = 0, 1, 2, 1, 1, 2, 2",
        "best[6] = best[3] + 1 coin of 3 = 2",
      ],
      result: "2 coins (3 + 3)",
    },
    cost: [{ label: "Time", value: "O(amount × number of coins)" }],
    buildsOn: ["fibonacci-memo"],
  },
  {
    id: "knapsack",
    name: "0/1 knapsack",
    group: "Dynamic programming",
    level: "advanced",
    stage: 4,
    tile: "D4.8",
    summary: "Choose items to carry for the most value without going over the weight limit.",
    visual: [
      "An items × capacity table filling cell by cell",
      "The chosen items traced back through the table",
    ],
    example: {
      input: "Capacity 4; A (weight 1, value 1), B (3, 5), C (4, 5)",
      steps: ["Take C alone → value 5", "Take A + B → weight 4, value 6", "Best = A + B"],
      result: "Value 6",
    },
    cost: [{ label: "Time", value: "O(n × capacity)" }],
    buildsOn: ["fibonacci-memo"],
  },
  {
    id: "lcs",
    name: "Longest common subsequence",
    group: "Dynamic programming",
    level: "advanced",
    stage: 5,
    tile: "D4.8",
    summary:
      "The longest sequence of letters that appears in order in both strings, not necessarily side by side.",
    visual: [
      "A grid with one string across and one down",
      "Matching letters light up a diagonal path",
    ],
    example: {
      input: '"ABCB" and "BDCB"',
      steps: ["B matches B", "C matches C", "B matches B"],
      result: '"BCB", length 3',
    },
    cost: [{ label: "Time", value: "O(n × m)" }],
    buildsOn: ["fibonacci-memo"],
  },
  {
    id: "edit-distance",
    name: "Edit distance",
    group: "Dynamic programming",
    level: "advanced",
    stage: 5,
    tile: "D4.8",
    summary:
      "The fewest inserts, deletes and replacements that turn one word into another. Used in spell checkers.",
    visual: ["The DP grid with the cheapest edit path traced", "Each edit animated on the word"],
    example: {
      input: '"cat" → "cut"',
      steps: ["c = c, keep", "a ≠ u, replace a with u", "t = t, keep"],
      result: "Distance 1",
    },
    cost: [{ label: "Time", value: "O(n × m)" }],
    buildsOn: ["lcs"],
  },
  // ---------- Backtracking ----------
  {
    id: "subsets",
    name: "Generating subsets",
    group: "Backtracking",
    level: "intermediate",
    stage: 4,
    tile: "D4.4",
    summary: 'For each item, branch on "take it" or "skip it" to list every subset.',
    visual: ["A decision tree with take/skip branches", "Each leaf is one subset"],
    example: {
      input: "[1, 2]",
      steps: [
        "Skip 1, skip 2 → []",
        "Skip 1, take 2 → [2]",
        "Take 1, skip 2 → [1]",
        "Take 1, take 2 → [1, 2]",
      ],
      result: "4 subsets (2²)",
    },
    cost: [{ label: "Time", value: "O(2ⁿ)" }],
    buildsOn: ["recursion"],
  },
  {
    id: "n-queens",
    name: "N-Queens",
    group: "Backtracking",
    level: "advanced",
    stage: 4,
    tile: "D4.4",
    summary:
      "Place N queens on an N × N board so no two attack each other, undoing choices that lead to dead ends.",
    visual: ["The board with attacked squares shaded", "Backtracking lifts queens off again"],
    example: {
      input: "4 × 4 board",
      steps: [
        "Row 1 col 1, row 2 col 3 → row 3 has no safe square → back up",
        "Row 2 col 4, row 3 col 2 → row 4 has no safe square → back up to row 1",
        "Row 1 col 2, row 2 col 4, row 3 col 1, row 4 col 3 → solved",
      ],
      result: "Queens in columns 2, 4, 1, 3",
    },
    cost: [{ label: "Worst case", value: "O(n!)" }],
    buildsOn: ["subsets"],
  },
  // ---------- Strings & numbers ----------
  {
    id: "string-matching",
    name: "String matching (naive)",
    group: "Strings & numbers",
    level: "beginner",
    stage: 3,
    tile: "D5.4",
    summary: "Slide the pattern along the text and compare letter by letter at every position.",
    visual: ["The pattern sliding under the text", "Matches green, mismatches red"],
    example: {
      input: 'Find "ab" in "aab"',
      steps: ["Position 0: a = a, a ≠ b → slide", "Position 1: a = a, b = b → match"],
      result: "Found at position 1",
    },
    cost: [{ label: "Time", value: "O(n × m)" }],
  },
  {
    id: "kmp",
    name: "Knuth–Morris–Pratt (KMP)",
    group: "Strings & numbers",
    level: "advanced",
    stage: 5,
    tile: "D5.4",
    summary:
      "String matching that never re-reads the text, using a table of how the pattern overlaps itself.",
    visual: [
      "The prefix table built step by step",
      "On a mismatch, the pattern jumps instead of restarting",
    ],
    example: {
      input: 'Pattern "abab"',
      steps: [
        "Prefix table: a → 0, ab → 0, aba → 1, abab → 2",
        'After matching "aba" then a mismatch, resume from length 1 instead of 0',
      ],
      result: "Each text letter is read once",
    },
    cost: [{ label: "Time", value: "O(n + m)" }],
    buildsOn: ["string-matching"],
  },
  {
    id: "gcd",
    name: "Euclid's GCD",
    group: "Strings & numbers",
    level: "beginner",
    stage: 2,
    tile: "D5.6",
    summary: "The greatest common divisor, found by repeatedly replacing (a, b) with (b, a mod b).",
    visual: ["Each step shown as a rectangle being tiled by squares", "The pair shrinking quickly"],
    example: {
      input: "gcd(48, 18)",
      steps: [
        "48 mod 18 = 12 → gcd(18, 12)",
        "18 mod 12 = 6 → gcd(12, 6)",
        "12 mod 6 = 0 → answer 6",
      ],
      result: "6",
    },
    cost: [{ label: "Time", value: "O(log min(a, b))" }],
  },
  {
    id: "sieve",
    name: "Sieve of Eratosthenes",
    group: "Strings & numbers",
    level: "beginner",
    stage: 3,
    tile: "D5.6",
    summary: "List all primes up to n by crossing out the multiples of each prime.",
    visual: ["A number grid with multiples crossed out", "Each prime gets its own colour"],
    example: {
      input: "n = 10",
      steps: [
        "2 is prime → cross out 4, 6, 8, 10",
        "3 is prime → cross out 9",
        "4 is already crossed; 4 × 4 > 10 → stop",
      ],
      result: "Primes 2, 3, 5, 7",
    },
    cost: [{ label: "Time", value: "O(n log log n)" }],
  },
];

/**
 * System design lessons (CURRICULUM D7.2 / B7.3), built ahead of the roadmap.
 * Each one is a small simulation the learner drives, with the Python that makes
 * the system's decision shown beside it.
 */
const SYSTEM_ENTRIES: Entry[] = [
  {
    id: "load-balancing",
    name: "Load balancing",
    group: "Scaling",
    level: "beginner",
    stage: 1,
    tile: "D7.2",
    summary:
      "One front door for many servers. The load balancer picks a server for every request, and stops sending work to servers that fail their health checks.",
    visual: [
      "The balancer, its servers, and each server's queue of requests",
      "Each request travels to the server the policy picks",
      "Switch between round robin and least connections, or take a server down, and watch the queues",
    ],
    example: {
      input: "3 servers A, B, C; round robin",
      steps: [
        "Requests 1, 2, 3 → A, B, C, in turn",
        "Request 4 → A again",
        "B fails its health check → it leaves the pool",
        "Request 5 → A, request 6 → C (B is skipped)",
      ],
      result: "Every request reached a healthy server",
    },
    cost: [
      { label: "Pick a server (round robin)", value: "O(1)" },
      {
        label: "Pick a server (least connections)",
        value: "O(n) for n servers; O(log n) with a heap",
      },
    ],
    buildsOn: ["queue"],
  },
];

export const STRUCTURES: readonly CatalogItem[] = STRUCTURE_ENTRIES.map((e) => ({
  ...e,
  kind: "structure",
}));
export const ALGORITHMS: readonly CatalogItem[] = ALGORITHM_ENTRIES.map((e) => ({
  ...e,
  kind: "algorithm",
}));
export const SYSTEMS: readonly CatalogItem[] = SYSTEM_ENTRIES.map((e) => ({
  ...e,
  kind: "system",
}));
export const CATALOG: readonly CatalogItem[] = [...STRUCTURES, ...ALGORITHMS, ...SYSTEMS];

/** The route section each kind lives under. */
export const KIND_PATH: Record<CatalogKind, "/algorithms" | "/structures" | "/systems"> = {
  algorithm: "/algorithms",
  structure: "/structures",
  system: "/systems",
};

export function itemsOfKind(kind: CatalogKind): readonly CatalogItem[] {
  return kind === "algorithm" ? ALGORITHMS : kind === "structure" ? STRUCTURES : SYSTEMS;
}

export function findItem(id: string): CatalogItem | undefined {
  return CATALOG.find((item) => item.id === id);
}

export function itemPath(item: CatalogItem): string {
  return `${KIND_PATH[item.kind]}/${item.id}`;
}

/** Groups in first-appearance order, each with its items in catalog order. */
export function groupItems(
  items: readonly CatalogItem[],
): { group: string; items: CatalogItem[] }[] {
  const groups = new Map<string, CatalogItem[]>();
  for (const item of items) {
    const list = groups.get(item.group) ?? [];
    list.push(item);
    groups.set(item.group, list);
  }
  return [...groups].map(([group, list]) => ({ group, items: list }));
}
