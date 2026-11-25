/** Short definitions, each pointing at where AlgoVerse teaches it. */
export type Term = { term: string; text: string; path: string };

export const GLOSSARY: readonly Term[] = [
  {
    term: "ACID",
    text: "The four promises of a database transaction: atomic, consistent, isolated, durable.",
    path: "/systems/sql-nosql?step=2",
  },
  {
    term: "Availability zone",
    text: "A separate data centre inside a cloud region, with its own power and network.",
    path: "/systems/redundancy?step=5",
  },
  {
    term: "Backoff (exponential)",
    text: "Waiting longer before each retry (100 ms, 200 ms, 400 ms…), usually with random jitter.",
    path: "/systems/timeouts-retries?step=5",
  },
  {
    term: "Big-O",
    text: "How the cost of an algorithm grows with the input size, ignoring constant factors.",
    path: "/algorithms/linear-search",
  },
  {
    term: "Binary search",
    text: "Finding a value in sorted data by halving the range at every step: O(log n).",
    path: "/algorithms/binary-search",
  },
  {
    term: "Bloom filter",
    text: 'A tiny bit array that answers "definitely not" or "maybe" about set membership.',
    path: "/structures/bloom-filter",
  },
  {
    term: "B-tree",
    text: "A shallow, wide search tree whose nodes are disk pages; the classic database index.",
    path: "/systems/indexes?step=3",
  },
  {
    term: "Cache-aside",
    text: "Check the cache; on a miss, read the database and store the answer in the cache.",
    path: "/systems/caching?step=3",
  },
  {
    term: "CAP theorem",
    text: "During a network partition, a replicated system must choose consistency or availability.",
    path: "/systems/cap?step=7",
  },
  {
    term: "CDN",
    text: "A network of edge servers that keep copies of static files close to users.",
    path: "/systems/cdn?step=3",
  },
  {
    term: "Circuit breaker",
    text: "Stops calling a failing service for a while, failing fast instead.",
    path: "/systems/timeouts-retries?step=6",
  },
  {
    term: "Consistent hashing",
    text: "Placing servers and keys on a ring so adding a server moves only about 1/N of the keys.",
    path: "/systems/consistent-hashing?step=2",
  },
  {
    term: "Dead-letter queue",
    text: "Where a message goes after failing too many times, for someone to inspect.",
    path: "/systems/queues?step=7",
  },
  {
    term: "Eventual consistency",
    text: "Copies may disagree for a while but converge once updates stop arriving.",
    path: "/systems/cap?step=5",
  },
  {
    term: "Fan-out",
    text: "One request or event spreading to many servers or recipients.",
    path: "/systems/news-feed?step=5",
  },
  {
    term: "Hash table",
    text: "Turns a key into a bucket number, so lookups take O(1) time on average.",
    path: "/structures/hash-table",
  },
  {
    term: "Heap",
    text: "A tree kept in an array where each parent is smaller than its children; the minimum is on top.",
    path: "/structures/binary-heap",
  },
  {
    term: "Idempotent",
    text: "Doing it twice has the same effect as doing it once, so it is safe to retry.",
    path: "/systems/timeouts-retries?step=7",
  },
  {
    term: "Latency",
    text: "How long one request takes, end to end.",
    path: "/systems/latency-throughput",
  },
  {
    term: "Leader election",
    text: "Servers agreeing which one of them is in charge, with a majority vote.",
    path: "/systems/consensus?step=4",
  },
  {
    term: "Little's law",
    text: "Requests in flight = throughput × latency.",
    path: "/systems/latency-throughput?step=7",
  },
  {
    term: "Load balancer",
    text: "One front door that spreads requests across a pool of servers.",
    path: "/systems/load-balancing?step=2",
  },
  {
    term: "LRU eviction",
    text: "When full, remove the entry that was used longest ago.",
    path: "/structures/lru-cache",
  },
  {
    term: "LSM-tree",
    text: "A storage engine that only appends sorted files and merges them in the background.",
    path: "/systems/storage-engines?step=7",
  },
  {
    term: "p99 latency",
    text: "The time only 1 request in 100 exceeds: the tail users actually feel.",
    path: "/systems/latency-throughput?step=4",
  },
  {
    term: "Partition (network)",
    text: "A fault that splits machines into groups that can't reach each other.",
    path: "/systems/cap?step=2",
  },
  {
    term: "Pub/sub",
    text: "Publishers announce events to a topic; every subscriber gets its own copy.",
    path: "/systems/pubsub?step=3",
  },
  {
    term: "Quorum",
    text: "Waiting for W of N copies on writes and R of N on reads; W + R > N overlaps.",
    path: "/systems/cap?step=8",
  },
  {
    term: "Rate limiting",
    text: "Giving each client a request budget and rejecting the excess with 429.",
    path: "/systems/rate-limiting?step=2",
  },
  {
    term: "Replication",
    text: "Keeping copies of data on several machines, usually a leader and followers.",
    path: "/systems/replication?step=2",
  },
  {
    term: "Saga",
    text: "A multi-service action done as local steps, each with a compensating undo.",
    path: "/systems/sagas?step=4",
  },
  {
    term: "Sharding",
    text: "Splitting data across machines by a shard key, so each holds part of it.",
    path: "/systems/sharding?step=2",
  },
  {
    term: "Single point of failure",
    text: "A part whose failure alone takes the whole system down.",
    path: "/systems/redundancy?step=2",
  },
  {
    term: "Stateless service",
    text: "A server that remembers nothing between requests, so any copy can serve any request.",
    path: "/systems/stateless?step=5",
  },
  {
    term: "Throughput",
    text: "How many requests a system finishes per second.",
    path: "/systems/latency-throughput",
  },
  {
    term: "Token bucket",
    text: "A rate limiter that allows short bursts and caps the average rate.",
    path: "/systems/rate-limiting?step=3",
  },
  {
    term: "Write-ahead log",
    text: 'Append each change to a log and sync it before saying "saved"; replay it after a crash.',
    path: "/systems/storage-engines?step=3",
  },
];

/** Numbers worth remembering, by order of magnitude. */
export const NUMBERS: readonly (readonly [string, string])[] = [
  ["Read from memory", "≈ 100 ns"],
  ["Read 1 MB sequentially from memory", "≈ 10 µs"],
  ["Read from an SSD", "≈ 100 µs"],
  ["Round trip inside one data centre", "≈ 0.5 ms"],
  ["Read 1 MB sequentially from an SSD", "≈ 1 ms"],
  ["Round trip across a continent", "50–150 ms"],
  ["Light in fibre", "≈ 200 km per ms"],
  ["Seconds in a day", "≈ 100,000"],
  ["1 million requests a day", "≈ 12 requests a second"],
  ["1 KB × 1 million", "1 GB"],
  ["Availability 99.9%", "≈ 8.8 hours down a year"],
  ["Availability 99.99%", "≈ 53 minutes down a year"],
];
