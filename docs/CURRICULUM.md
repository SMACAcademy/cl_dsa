# AlgoVerse — Complete Curriculum & Concept Hierarchy

> Deliverable 2. The curriculum is organized as **tiles** on the Expanding Pyramid (see [PYRAMID_MODEL](PYRAMID_MODEL.md)).
> ▲ **Domain** = upright triangle (a coherent knowledge domain). ▼ **Bridge** = inverted triangle (integration of the 2–3 domains it touches).

## 0. How to read this document

### 0.1 Hierarchy

```text
Universe
 └─ Tier (row r of the pyramid; tiers 0..8 today, unbounded later)
     └─ Tile  (▲ Domain or ▼ Bridge), id D<r>.<c> or B<r>.<c>
         └─ Module (a group of 3–8 related concepts)
             └─ Concept (the atomic unit of mastery; has one lesson)
                 └─ Lesson (12 sections A–L) + Items + Problems
```

- **Concept IDs** are stable slugs: `<tile-slug>.<concept-slug>`, e.g. `first-algorithms.binary-search`.
- A concept belongs to exactly **one** tile (its home), but can have prerequisites anywhere. The **prerequisite graph** is a DAG over concepts and is independent of tile placement.
- ★ marks **core concepts**: completing all ★ concepts completes the tile. Unmarked concepts are enrichment.
- **MVP** marks concepts fully built in the MVP (Phase 4). Everything else is scheduled in [ROADMAP](ROADMAP.md).
- **Maturity labels** (shown in the UI on every concept): `E` Established industry/academic technique · `R` Research-level (published, not yet mainstream) · `X` Emerging/experimental. Unlabelled = `E`.

### 0.2 Mapping the brief's "Levels" to tiles

| Brief level | Where it lives |
|---|---|
| L0 Understanding CS | D0.0 Computing Foundations |
| L1 Programming foundations | D1.0 Programming Logic in Python, B2.1 |
| L2 Math & algorithmic foundations | D1.2 Data & Complexity Foundations, D2.4 Discrete Math & Analysis, B2.3 |
| L3 Fundamental data structures | D1.2 (arrays), D2.0, D3.0, D3.2, D4.0, D4.2, D5.2, D6.2 |
| L4 Fundamental algorithms | B1.1, D2.2, D3.4, B3.3, D4.4 |
| L5 Algorithmic paradigms | D3.6, D2.2, D4.4, D4.6, D4.8, B4.5, B4.7, B5.9, D6.2 |
| L6 Advanced graph algorithms | D4.0, D5.0, D6.0, B5.1, B6.1 |
| L7 String & pattern algorithms | D5.4, B5.3, B5.5, D4.8 (LCS/edit distance) |
| L8 Specialized & advanced | D5.6, D5.10, D6.4, D6.8, D6.10, D6.12, D7.8 |
| L9 Industry applications | Tier 7 (D7.0–D7.14) and D6.6 |
| Emerging areas | Tier 8 (frontier) |

### 0.3 Cross-cutting threads

Every concept is tagged with the threads it advances. The Library can filter by thread.

| Thread | Meaning |
|---|---|
| 🐍 Python | Python language skills used or taught |
| 📈 Complexity | Time/space analysis practice |
| 🧠 Proof | Correctness reasoning (invariants, induction) |
| 🌍 Real world | Industry usage |
| 🧩 Pattern | Problem-solving pattern recognition |

---

## TIER 0 — The Apex

### ▲ D0.0 Computing Foundations — *"What is computer science, and what happens inside the machine?"*

Analogy-driven, no prior knowledge. Visuals: toy CPU, memory grid, bit switches.

| Module | Concepts |
|---|---|
| 0.A What is CS? | ★MVP `what-is-computer-science` · ★MVP `what-is-an-algorithm` (recipe analogy; properties: finite, definite, input, output, effective) · ★ `what-is-programming` · `what-is-a-program` · ★MVP `what-is-a-data-structure` · `why-data-structures` (library-shelf analogy) · `why-algorithms` (phone-book search) |
| 0.B Inside the machine | ★MVP `cpu-and-instructions` (fetch–decode–execute) · `registers` · ★MVP `memory-and-addresses` (numbered lockers) · ★ `ram-vs-storage` · `load-and-store` |
| 0.C Representing data | ★MVP `bits-and-bytes` · ★MVP `binary-numbers` · `negative-numbers` (two's complement intro) · `text-encoding` (ASCII → Unicode/UTF-8) · `representing-images-and-sound` |
| 0.D How Python runs | ★MVP `how-python-executes` (source → bytecode → virtual machine; `dis` demo) · `names-and-objects-preview` |

**Mastery challenge:** *Be the CPU.* Execute a 6-instruction program on the toy machine and predict register and memory contents.

---

## TIER 1 — The First Pyramid (side 2)

### ▲ D1.0 Programming Logic in Python

| Module | Concepts |
|---|---|
| 1.A Values & names | ★MVP `variables-and-names` · ★ `data-types` · ★ `operators-and-expressions` · `input-and-output` |
| 1.B Control flow | ★MVP `conditionals` · `boolean-logic` · ★MVP `while-loops` · ★MVP `for-loops-and-range` · ★ `nested-loops` · ★ `loop-patterns` (accumulator, counter, flag, linear-scan) |
| 1.C Functions | ★MVP `functions` · ★ `parameters-and-return-values` · ★ `scope` (LEGB) · ★MVP `recursion-intro` |
| 1.D Collections | ★MVP `lists` · `tuples` · ★MVP `strings` · ★MVP `dictionaries` · `sets` · `comprehensions` |
| 1.E Objects & memory | ★ `classes-and-objects` · ★MVP `references-and-identity` · ★ `mutable-vs-immutable` · `python-memory-model` (heap, reference counting intro) |
| 1.F Craft | ★ `reading-code` · ★ `tracing-by-hand` · ★MVP `debugging` · `testing-with-assert` · `exceptions` |

**Mastery challenge:** *Fix the broken grade calculator* (3 planted bugs), then write `count_vowels` from a blank editor against hidden tests.

### ▲ D1.2 Data & Complexity Foundations

| Module | Concepts |
|---|---|
| 1.2.A Arrays | ★MVP `what-is-an-array` (contiguous memory) · ★MVP `indexing-and-address-arithmetic` · ★MVP `array-operations-and-costs` (access O(1), insert/delete shifting O(n)) · ★MVP `python-list-as-dynamic-array` (over-allocation, amortized append intro) · `two-dimensional-arrays` |
| 1.2.B Math tools | ★ `number-systems` (bin/oct/hex) · `binary-arithmetic` · ★ `exponents` · ★MVP `logarithms` ("how many halvings?") · ★ `summation-intro` (1+2+…+n) |
| 1.2.C Counting cost | ★MVP `counting-operations` · ★MVP `growth-rates` (1, log n, n, n log n, n², 2ⁿ) · ★MVP `big-o-intro` · ★ `time-vs-space` · ★MVP `best-average-worst-case` · `complexity-comparison-charts` |

**Mastery challenge:** *Faster or slower?* Rank 6 code snippets by growth, then confirm by measuring op counts in the playground.

### ▼ B1.1 First Algorithms — *bridge of D1.0 × D1.2 × D0.0*

Where programming, arrays and cost analysis meet for the first time.

| Module | Concepts |
|---|---|
| Searching | ★MVP `linear-search` · ★MVP `binary-search` (iterative; invariant `lo ≤ target position ≤ hi`) |
| Elementary sorting | ★MVP `bubble-sort` (with early exit) · ★MVP `selection-sort` · ★MVP `insertion-sort` |
| Thinking about algorithms | ★MVP `comparing-sorting-algorithms` (Battle Arena lite) · `loop-invariants-intro` · `correctness-by-testing` |

**Mastery challenge (Pyramid I capstone):** *Search & Sort Showdown.* Predict 5 next steps on unseen traces, implement insertion sort from scratch, and explain (by reasons) why binary search needs sorted input.

---

## TIER 2 — Pyramid side 3

### ▲ D2.0 Linear Data Structures
★ `dynamic-arrays` (doubling, amortized O(1) append) · ★ `singly-linked-list` · ★ `doubly-linked-list` · `circular-linked-list` · ★ `stack` · ★ `queue` · ★ `circular-queue` (ring buffer) · ★ `deque` · `priority-queue-naive` · `strings-as-arrays` (immutability, join/builder) · ★ `choosing-a-linear-structure`

### ▼ B2.1 Pointers, References & the Call Stack — *D2.0 × D2.2 × D1.0*
★ `references-as-pointers` · ★ `call-stack` · ★ `stack-frames` · ★ `recursion-uses-a-stack` · `recursion-to-iteration` (explicit stack) · `memory-diagrams`

### ▲ D2.2 Recursion & Divide and Conquer
★ `recursive-thinking` · ★ `base-and-recursive-cases` · ★ `recursion-trees` · ★ `tower-of-hanoi` · ★ `merge-sort` · ★ `quick-sort` (Lomuto, Hoare) · `quickselect` · `binary-search-recursive` · ★ `divide-and-conquer-pattern` · `fast-power` · `karatsuba-multiplication`

### ▼ B2.3 Recurrences & Correctness — *D2.2 × D2.4 × D1.2*
★ `recurrence-relations` · `substitution-method` · ★ `recursion-tree-method` · ★ `master-theorem` · ★ `loop-invariants` · ★ `correctness-by-induction`

### ▲ D2.4 Discrete Mathematics & Analysis
★ `sets-and-set-operations` · `functions-and-relations` · ★ `propositional-logic` · ★ `proof-techniques` (direct, contrapositive, contradiction) · ★ `mathematical-induction` · ★ `summations` · ★ `combinatorics-basics` · ★ `permutations-and-combinations` · ★ `big-omega-and-theta` · `asymptotic-growth-formal` · ★ `amortized-analysis` (aggregate, accounting, potential) · ★ `probability-basics` (expectation, linearity)

---

## TIER 3 — Pyramid side 4

### ▲ D3.0 Trees & Heaps
★ `tree-terminology` · ★ `binary-trees` · ★ `tree-traversals` (pre/in/post/level order) · ★ `binary-search-trees` (search/insert/delete) · `bst-degeneration` · ★ `binary-heap` · ★ `heapify-build-heap` (O(n) proof) · ★ `heap-operations` · ★ `priority-queue-with-heap` · ★ `heap-sort` · `array-based-trees` · `expression-trees`

### ▼ B3.1 Designing Data Structures: Maps, Sets & Caches — *D3.0 × D3.2 × D2.0*
★ `map-and-set-abstractions` · ★ `tree-map-vs-hash-map` · ★ `lru-cache` (hash map + doubly linked list) · `ordered-iteration` · ★ `choosing-a-structure`

### ▲ D3.2 Hashing
★ `hash-functions` · ★ `hash-tables` · ★ `hash-collisions` · ★ `separate-chaining` · ★ `open-addressing` (linear, quadratic, double hashing) · ★ `load-factor` · ★ `resizing-and-rehashing` · `python-dict-internals` · ★ `hash-sets` · ★ `hashing-patterns` (frequency count, two-sum, grouping) · `universal-hashing`

### ▼ B3.3 Sort vs Hash: Organizing Data — *D3.2 × D3.4 × D2.2*
★ `sort-or-hash` (dedupe, grouping trade-offs) · ★ `counting-sort` · ★ `radix-sort` · ★ `bucket-sort` · `distribution-vs-comparison-sorting`

### ▲ D3.4 Sorting & Searching Mastery
★ `sorting-properties` (stable, in-place, adaptive, online; comparison vs non-comparison) · `shell-sort` · ★ `timsort` (runs, galloping; Python's `sorted`) · ★ `introsort` · ★ `binary-search-variations` (lower/upper bound, first/last occurrence) · ★ `search-in-rotated-array` · `ternary-search` · `jump-search` · `interpolation-search` · `exponential-search` · ★ `python-sorting-in-practice` (`key`, stability, `bisect`)

### ▼ B3.5 Lower Bounds, Randomization & Proof — *D3.4 × D3.6 × D2.4*
★ `comparison-sort-lower-bound` (decision trees, Ω(n log n)) · ★ `randomized-quicksort-analysis` (expected O(n log n)) · ★ `deterministic-vs-randomized` · `proving-two-pointer-algorithms`

### ▲ D3.6 Problem-Solving Paradigms I
★ `brute-force` · ★ `two-pointers` · ★ `sliding-window` (fixed & variable) · ★ `prefix-sums` · ★ `difference-arrays` · ★ `binary-search-on-the-answer` · ★ `pattern-recognition-101` (*how to recognize which paradigm a problem needs*) · `problem-decomposition`

---

## TIER 4 — Pyramid side 5

| Tile | Concepts |
|---|---|
| ▲ D4.0 Graph Foundations | ★ terminology · ★ directed/undirected · ★ weighted/unweighted · ★ adjacency-matrix · ★ adjacency-list · edge-list · ★ BFS · ★ DFS · ★ connected-components · ★ cycle-detection · ★ DAGs · ★ topological-sort (Kahn, DFS) · bipartite-check · ★ grid-graphs-and-mazes · special-graphs |
| ▼ B4.1 Trees as Graphs (D4.0 × D4.2 × D3.0) | ★ spanning-trees · dfs-tree-edge-classification · ★ lca-naive · tree-diameter · euler-tour |
| ▲ D4.2 Advanced Trees | ★ why-balance · ★ AVL (rotations) · ★ red-black-trees · ★ B-trees · ★ B+ trees · ★ tries · ★ segment-trees (+ lazy propagation) · ★ Fenwick trees · treaps |
| ▼ B4.3 Prefix Trees & Search (D4.2 × D4.4 × D3.2) | ★ trie-guided-backtracking (word search) · ★ autocomplete-with-tries · tries-vs-hashing |
| ▲ D4.4 Backtracking & Search Spaces | ★ state-space-trees · ★ permutations · ★ combinations · ★ subsets · ★ N-Queens · ★ Sudoku · ★ maze-solving · ★ constraint-satisfaction · ★ pruning · ★ branch-and-bound · meet-in-the-middle |
| ▼ B4.5 Exhaustive vs Greedy Choice (D4.4 × D4.6 × D3.4) | ★ interval-scheduling · ★ exchange-argument · ★ when-greedy-fails |
| ▲ D4.6 Greedy Algorithms | ★ greedy-choice-property · ★ activity-selection · ★ fractional-knapsack · ★ Huffman-coding · job-sequencing · minimum-platforms |
| ▼ B4.7 Optimal Substructure (D4.6 × D4.8 × D3.6) | ★ overlapping-subproblems · ★ brute-force-to-memoization · ★ coin-change-greedy-vs-dp |
| ▲ D4.8 Dynamic Programming | ★ memoization · ★ tabulation · ★ state-design · ★ 1D DP · ★ 2D/grid DP · ★ 0/1 knapsack · unbounded-knapsack · ★ LIS · ★ LCS · ★ edit-distance · matrix-chain · ★ space-optimization · ★ reconstructing-solutions |

## TIER 5 — Pyramid side 6

| Tile | Concepts |
|---|---|
| ▲ D5.0 Shortest Paths & Spanning Trees | ★ Dijkstra · ★ Bellman-Ford · ★ Floyd-Warshall · ★ A* · 0-1 BFS · ★ Prim · ★ Kruskal · shortest-paths-in-DAGs · negative-cycles |
| ▼ B5.1 Graph Algorithm Engineering (D5.0 × D5.2 × D4.0) | ★ Kruskal-with-DSU · ★ Dijkstra-with-heaps (lazy deletion vs decrease-key) · representation-vs-complexity |
| ▲ D5.2 Specialized Data Structures | ★ disjoint-set-union / union-find (rank, path compression) · ★ skip-lists · ★ sparse-tables · ★ monotonic-stack · ★ monotonic-queue · ★ interval-structures (interval trees) · persistent-data-structures · immutable-structures (structural sharing) · rope |
| ▼ B5.3 Suffix & Index Structures (D5.2 × D5.4 × D4.2) | ★ suffix-tries · ★ suffix-arrays · suffix-trees · ★ LCP-array |
| ▲ D5.4 String Algorithms | ★ naive-matching · ★ KMP · ★ Z-algorithm · ★ Rabin-Karp · Boyer-Moore · ★ Aho-Corasick · suffix-automaton · Manacher · string-hashing · regex-as-automata |
| ▼ B5.5 Fingerprints & Rolling Hashes (D5.4 × D5.6 × D4.4) | ★ rolling-hash · polynomial-hashing-mod-p · plagiarism-detection (winnowing) · DNA-k-mer-matching |
| ▲ D5.6 Number Theory | ★ gcd & extended Euclid · ★ modular-arithmetic · ★ modular-exponentiation · ★ modular-inverse · ★ sieve-of-Eratosthenes · ★ primality (trial, Miller–Rabin; randomized) · factorization (trial, Pollard ρ) · ★ Chinese-remainder-theorem · Fermat/Euler theorems |
| ▼ B5.7 Mathematical Optimization (D5.6 × D5.8 × D4.6) | ★ matrix-exponentiation-for-recurrences · LP-intuition · exchange-arguments-revisited |
| ▲ D5.8 Advanced Dynamic Programming | ★ bitmask DP · ★ DP on trees · DP on DAGs · ★ interval DP · digit DP · DP optimizations (convex hull trick, D&C opt, Knuth) · sequence-alignment (Needleman–Wunsch) |
| ▼ B5.9 Geometric DP & Sweep Line (D5.8 × D5.10 × D4.8) | ★ sweep-line · union-of-intervals-area · convex-hull-trick-geometric-view |
| ▲ D5.10 Computational Geometry | ★ vectors & cross product · ★ orientation · ★ segment-intersection · ★ convex-hull (Andrew monotone chain, Graham, Jarvis) · ★ closest-pair (D&C) · point-in-polygon · polygon-area (shoelace) · Bentley–Ottmann · Voronoi (Fortune) · Delaunay · k-d trees |

## TIER 6 — Pyramid side 7

| Tile | Concepts |
|---|---|
| ▲ D6.0 Advanced Graphs II | ★ SCC (Kosaraju, Tarjan) · ★ bridges & articulation points · ★ max-flow (Ford–Fulkerson, Edmonds–Karp) · Dinic · ★ min-cut theorem · ★ bipartite matching (Hopcroft–Karp) · ★ LCA (binary lifting) · heavy-light decomposition · Euler paths · 2-SAT |
| ▼ B6.1 Randomized Graph Algorithms (D6.0 × D6.2 × D5.0) | Karger-min-cut · random-walks · PageRank-as-random-walk |
| ▲ D6.2 Probabilistic & Streaming Algorithms | ★ Las Vegas vs Monte Carlo · ★ reservoir-sampling · ★ Bloom filters · ★ Count-Min Sketch · ★ HyperLogLog · MinHash & LSH · streaming-model |
| ▼ B6.3 Sketches & Succinct Structures (D6.2 × D6.4 × D5.2) | bitsets · rank/select (succinct) · compressed-filters |
| ▲ D6.4 Compression & Coding | ★ entropy-intro · ★ run-length · ★ Huffman (revisited) · ★ LZ77/LZ78/LZW · Burrows–Wheeler · delta & varint encoding · ★ error-detection (parity, CRC) |
| ▼ B6.5 Encoding, Hashing & Integrity (D6.4 × D6.6 × D5.4) | checksums-vs-cryptographic-hashes · content-addressing (git objects) |
| ▲ D6.6 Cryptography & Blockchain | ★ cryptographic-hash-functions · ★ symmetric-vs-public-key · ★ RSA · ★ Diffie–Hellman · ★ digital-signatures · ★ Merkle-trees · Merkle-Patricia-tries · ★ proof-of-work (concept) · proof-of-stake (concept) · elliptic-curves (concept) |
| ▼ B6.7 Hard Problems as Foundations (D6.6 × D6.8 × D5.6) | one-way-functions · factoring & discrete-log hardness · why-quantum-threatens-RSA |
| ▲ D6.8 Intractability & Approximation | ★ P, NP, NP-complete · ★ reductions · SAT · ★ approximation (vertex cover 2-approx, greedy set cover) · metric-TSP approximations · ★ online-algorithms (ski rental, paging, competitive ratio) · local-search & simulated annealing |
| ▼ B6.9 Optimization under Constraints (D6.8 × D6.10 × D5.8) | pseudo-polynomial-knapsack · FPTAS (concept) · LP-relaxation & rounding |
| ▲ D6.10 Numerical & Scientific Algorithms | ★ floating-point & error · ★ matrix-multiplication (naive, Strassen) · ★ Gaussian-elimination · LU-decomposition · ★ FFT (polynomial multiplication) · Newton's method · ★ gradient-based numerical optimization · Monte-Carlo integration |
| ▼ B6.11 Geometric & Numeric Parallelism (D6.10 × D6.12 × D5.10) | parallel-prefix · parallel-FFT idea · data-parallel geometry |
| ▲ D6.12 Parallel & Concurrent Algorithms | ★ work–span model · ★ parallel-reduction · ★ parallel-scan · parallel-merge-sort · ★ MapReduce · ★ GPU execution model (SIMT) · ★ race-conditions · ★ locks & mutexes · ★ lock-free (CAS) · concurrent-queues · Amdahl/Gustafson |

## TIER 7 — Systems & Industry (pyramid side 8)

| Tile | Concepts |
|---|---|
| ▲ D7.0 Networking & Routing | ★ routing-basics · ★ distance-vector (Bellman–Ford) · ★ link-state (Dijkstra/OSPF) · path-vector (BGP concept) · ★ congestion-control (AIMD) · fair-queuing · token-bucket |
| ▼ B7.1 Flows in Networks (D7.0 × D7.2 × D6.0) | capacity-planning-with-max-flow · ECMP |
| ▲ D7.2 Distributed Systems | ★ logical clocks (Lamport, vector) · ★ consistent-hashing · ★ DHTs (Chord, Kademlia) · ★ replication & quorums · ★ leader-election (bully, ring) · ★ consensus (Paxos, Raft) · gossip · CRDTs · distributed-queues · ★ load-balancing (round-robin, least-connections, power-of-two-choices) · distributed-scheduling |
| ▼ B7.3 Scaling Data (D7.2 × D7.4 × D6.2) | sharding · distinct-counting-at-scale (HLL) · hot-key mitigation |
| ▲ D7.4 Search Engines & IR | ★ tokenization · ★ inverted-index · ★ TF-IDF · ★ BM25 · ★ PageRank · posting-list intersection · ★ autocomplete (trie + top-k) · spelling-correction (edit distance, BK-trees) · crawling (BFS) |
| ▼ B7.5 Indexing & Compression (D7.4 × D7.6 × D6.4) | posting-compression (delta + varint) · skip-pointers · B+tree-vs-inverted-index |
| ▲ D7.6 Database Internals | ★ pages & storage · ★ buffer-pool (LRU, clock) · ★ B+tree index · hash-index · ★ LSM-trees (memtable, SSTables, compaction, Bloom filters) · ★ join algorithms (nested loop, hash, sort-merge) · ★ external-sort · ★ query-optimization (cost model, join-order DP) · ★ concurrency control (2PL, MVCC) · WAL & recovery (ARIES concept) |
| ▼ B7.7 Reliable Storage (D7.6 × D7.8 × D6.6) | write-ahead-logs · anti-entropy-with-Merkle-trees · checksummed pages |
| ▲ D7.8 Operating Systems & Memory Hierarchy | ★ CPU scheduling (FCFS, SJF, RR, priority, MLFQ; CFS concept) · ★ memory allocation (first/best fit, buddy, slab) · ★ virtual memory & paging · ★ page replacement (FIFO, LRU, Clock, OPT, Bélády's anomaly) · ★ deadlock (detection, banker's) · ★ synchronization (semaphores, monitors) · lock-free structures (revisited) · ★ caches & memory hierarchy · cache-aware (blocking/tiling) · cache-oblivious algorithms · external-memory (I/O) model |
| ▼ B7.9 Scheduling & Heuristics (D7.8 × D7.10 × D6.8) | NP-hard scheduling · list-scheduling approximation · learned heuristics (R) |
| ▲ D7.10 Machine Learning Algorithms | ★ linear regression & gradient descent · ★ SGD, momentum, Adam · logistic regression · ★ backpropagation (computational graphs) · ★ decision trees (ID3/CART) · random forests (concept) · ★ k-means (Lloyd) · ★ k-NN · naive Bayes · evaluation & overfitting |
| ▼ B7.11 Embeddings & Distance (D7.10 × D7.12 × D6.10) | ★ distance metrics (Euclidean, cosine, dot) · curse-of-dimensionality · PCA (concept) |
| ▲ D7.12 Vector Search & Retrieval | ★ exact k-NN · k-d-tree limits in high dimensions · ★ LSH · ★ IVF (clustering-based) · ★ product quantization · ★ HNSW · ★ beam search · retrieval pipelines & re-ranking · recall vs latency trade-offs |
| ▼ B7.13 Search at Scale (D7.12 × D7.14 × D6.12) | beam-search-unified · GPU k-NN · parallel MCTS |
| ▲ D7.14 Game AI & Planning | ★ game trees · ★ minimax · ★ alpha-beta pruning · move-ordering · iterative-deepening · ★ Monte Carlo Tree Search (UCT) · grid pathfinding in games (A*) |

## TIER 8 — Frontier (pyramid side 9, partially fogged)

Every concept here shows its maturity label prominently, and its references are reviewed every 6 months (`review_by` date in content).

| Tile | Concepts | Maturity |
|---|---|---|
| ▲ D8.0 Byzantine Fault Tolerance & Blockchain Consensus | PBFT · Nakamoto consensus · finality | E/R |
| ▲ D8.2 Quantum Computing Foundations | qubits · superposition · gates & circuits · measurement · entanglement | E (theory) |
| ▲ D8.4 Quantum Algorithms | Deutsch–Jozsa · **Grover's search** · quantum Fourier transform · **Shor's factoring** · BQP | E (theory) / X (hardware at scale) |
| ▲ D8.6 Post-Quantum Cryptography | lattice problems (LWE) · ML-KEM (FIPS 203) · ML-DSA (FIPS 204) · SLH-DSA hash-based signatures (FIPS 205) · migration ("harvest now, decrypt later") | E (standards) |
| ▲ D8.8 GPU & Accelerator Algorithms | GPU reduction/scan · tiled matrix multiply · bitonic & radix sort on GPU · IO-aware attention tiling | E/R |
| ▲ D8.10 Evolutionary & Swarm Intelligence | genetic algorithms · evolution strategies · ant colony optimization · particle swarm optimization | E |
| ▲ D8.12 Neuromorphic Computing | spiking neural networks · event-driven computation · STDP learning | R/X |
| ▲ D8.14 Learned Data Structures | learned indexes · learned Bloom filters | R |
| ▲ D8.16 *Uncharted* | reserved for future topics — always fogged, "the universe never feels finished" | — |

Bridges in Tier 8 are authored as frontier content matures (see [PYRAMID_MODEL §5](PYRAMID_MODEL.md)).

---

## Problem-solving pattern catalogue (used by M12 tagging and the Pattern Recognition trainer)

| Pattern | Signal phrases in a problem statement | Home concept |
|---|---|---|
| Two pointers | "sorted array", "pair that sums to", "in-place", "palindrome" | `two-pointers` |
| Sliding window | "contiguous subarray/substring", "longest/shortest with condition", "at most k" | `sliding-window` |
| Prefix sums | "range sum queries", "subarray sum equals k" | `prefix-sums` |
| Hash map counting | "frequency", "anagram", "seen before", "duplicates" | `hashing-patterns` |
| Binary search on answer | "minimize the maximum", "smallest capacity such that…" | `binary-search-on-the-answer` |
| Monotonic stack | "next greater/smaller element", "span", "histogram" | `monotonic-stack` |
| BFS | "shortest number of steps", "unweighted", "grid", "levels" | `bfs` |
| DFS / backtracking | "all combinations/permutations", "generate every", "place N…" | `state-space-trees` |
| Topological sort | "dependencies", "prerequisites", "order of tasks" | `topological-sort` |
| Union-Find | "connected groups", "merge sets", "redundant connection" | `disjoint-set-union` |
| Heap / top-k | "k largest/smallest", "running median", "schedule by priority" | `priority-queue-with-heap` |
| Greedy | "maximize count of non-overlapping", "minimum number of…" with exchange property | `greedy-choice-property` |
| Dynamic programming | "number of ways", "min/max cost", choices at each step, overlapping subproblems | `state-design` |
| Dijkstra | "weighted shortest path", non-negative weights | `dijkstra` |
| Trie | "prefix", "autocomplete", "dictionary of words" | `tries` |

---

## Real-world application index (seed)

| Concept | Real-world use shown in its lesson section H |
|---|---|
| Binary search | `bisect` in Python, git bisect, database index lookups, version rollouts |
| Hash maps | caches, Python dicts, database hash indexes, deduplication |
| Queues | task schedulers, print spoolers, message brokers, BFS |
| Graphs | navigation/maps, social networks, dependency resolution (pip, npm) |
| Trees | file systems, DOM, B+tree database indexes, compilers (ASTs) |
| Heaps | OS/priority scheduling, Dijkstra, top-k analytics, event simulation |
| Tries | autocomplete, IP routing (longest-prefix match), spell checking |
| Dynamic programming | diff tools, spell check (edit distance), DNA alignment, route optimization |
| HNSW | vector databases and semantic search/retrieval systems |
| Bloom filters | LSM-tree databases (skip disk reads), web caches, malicious-URL checks |
| Consistent hashing | distributed caches, sharded databases, CDNs |
| Merkle trees | git, blockchains, distributed DB anti-entropy |

---

## Content volume estimate

| Tiers | Tiles | Concepts (approx.) | Lessons | Items (incl. generated families) | Problems |
|---|---|---|---|---|---|
| 0–1 (Pyramid I, MVP) | 4 | ~75 (34 built in MVP) | 75 | ~600 | ~40 |
| 2–3 | 12 | ~120 | 120 | ~1,000 | ~150 |
| 4–5 | 20 | ~200 | 200 | ~1,500 | ~300 |
| 6–7 | 28 | ~230 | 230 | ~1,500 | ~200 |
| 8 | 8 domains (+1 Uncharted, +8 bridges reserved) | ~40 | 40 | ~200 | ~20 |
| **Total** | **72 authored + 9 reserved = 81 tiles (9²)** | **~665** | **~665** | **~4,800** | **~710** |

The architecture is sized for this volume. Content is loaded per tile and lazily, so the size of the universe does not affect startup time.
