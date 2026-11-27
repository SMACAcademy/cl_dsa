/**
 * The inhabitants of the AlgoVerse world behind the landing page. Every object stands for
 * something the course teaches, and each zone gets its own stretch of space: the camera flies
 * through data structures, then algorithms, then system design, then AI as the page scrolls.
 * Plain data, so it can be checked without WebGL.
 */
export type Zone = "structures" | "algorithms" | "systems" | "ai";

export const ZONES: readonly Zone[] = ["structures", "algorithms", "systems", "ai"];

export type WorldObjectKind =
  | "array"
  | "linkedList"
  | "tree"
  | "hashTable"
  | "stack"
  | "sorting"
  | "binarySearch"
  | "bfs"
  | "dpGrid"
  | "recursion"
  | "loadBalancer"
  | "replicas"
  | "queue"
  | "hashRing"
  | "cdn"
  | "neural"
  | "vectors"
  | "agentLoop"
  | "mainframe"
  | "gateway";

export interface WorldObject {
  kind: WorldObjectKind;
  zone: Zone;
  /** What it stands for, as a learner would name it. */
  title: string;
  /** One line on what the object shows. */
  caption: string;
  /** x to the side (scaled down on narrow screens), y up, z into the scene. */
  position: readonly [number, number, number];
  /** Overall size, so objects read at a similar weight. */
  scale: number;
}

/** How far apart objects sit along the flight path, and where each zone's stretch starts. */
export const SPACING = 9;
export const ZONE_START: Record<Zone, number> = {
  structures: -2,
  algorithms: -52,
  systems: -102,
  ai: -152,
};

/** Half the distance between objects nearest the path and the path itself. */
export const LANE = 3.4;

const lane = (
  zone: Zone,
  i: number,
  side: 1 | -1,
  y: number,
): readonly [number, number, number] => [
  side * (LANE + (i % 2) * 0.9),
  y,
  ZONE_START[zone] - i * SPACING,
];

const o = (
  kind: WorldObjectKind,
  zone: Zone,
  i: number,
  side: 1 | -1,
  y: number,
  title: string,
  caption: string,
): WorldObject => ({ kind, zone, title, caption, position: lane(zone, i, side, y), scale: 1 });

export const WORLD_OBJECTS: readonly WorldObject[] = [
  // Data structures: the shapes.
  o("array", "structures", 0, 1, 0.3, "Array", "Eight slots, one index each"),
  o("linkedList", "structures", 1, -1, -0.2, "Linked list", "Each node points to the next"),
  o("tree", "structures", 2, 1, 0.4, "Binary tree", "Smaller left, larger right"),
  o("hashTable", "structures", 3, -1, 0, "Hash table", "A key's hash picks its bucket"),
  o("stack", "structures", 4, 1, -0.2, "Stack", "Last in, first out"),

  // Algorithms: the moves.
  o("sorting", "algorithms", 0, -1, 0.2, "Sorting", "Neighbours swap until all is in order"),
  o("binarySearch", "algorithms", 1, 1, -0.1, "Binary search", "Halve the range, every step"),
  o("bfs", "algorithms", 2, -1, 0.3, "Breadth-first search", "A wave, one level at a time"),
  o("dpGrid", "algorithms", 3, 1, 0, "Dynamic programming", "Each cell built from solved ones"),
  o("recursion", "algorithms", 4, -1, -0.3, "Recursion", "A problem made of smaller copies"),

  // System design: the whole machine.
  o("loadBalancer", "systems", 0, 1, 0.2, "Load balancing", "Requests spread across servers"),
  o("replicas", "systems", 1, -1, -0.2, "Replication", "One leader, copies that follow"),
  o("queue", "systems", 2, 1, 0.1, "Message queue", "Jobs wait until a worker is free"),
  o("hashRing", "systems", 3, -1, 0.3, "Consistent hashing", "Keys find their server on a ring"),
  o("cdn", "systems", 4, 1, -0.1, "CDN", "Copies served from near the user"),

  // AI and integration: the frontier.
  o("neural", "ai", 0, -1, 0.2, "Language model", "Layers that turn text into text"),
  o("vectors", "ai", 1, 1, -0.1, "Vector search", "Nearest meanings, not exact words"),
  o("agentLoop", "ai", 2, -1, 0.3, "AI agent", "Decide, call a tool, read, repeat"),
  o("mainframe", "ai", 3, 1, 0, "Mainframe", "The old core, behind a clean API"),
  o("gateway", "ai", 4, -1, -0.2, "LLM gateway", "Every model call checked and logged"),
];

/** Where the camera hovers to look at a zone's stretch of space. */
export function zoneCameraZ(zone: Zone): number {
  return ZONE_START[zone] + 7;
}

/** The camera's start and end, before and after every object. */
export const CAMERA_START_Z = 12;
export const CAMERA_END_Z = ZONE_START.ai - 4 * SPACING - 6;

/**
 * Turns the page's scroll position into a camera depth. Sections mark the depth they want with
 * stops: the scroll offset where they sit and the z the camera should be at there. Between stops
 * the camera eases in and out, so it settles at each zone instead of drifting past.
 */
export function cameraZAt(scroll: number, stops: readonly { at: number; z: number }[]): number {
  if (stops.length === 0) return CAMERA_START_Z;
  const sorted = [...stops].sort((a, b) => a.at - b.at);
  const first = sorted[0] as { at: number; z: number };
  if (scroll <= first.at) return first.z;
  for (let i = 1; i < sorted.length; i++) {
    const a = sorted[i - 1] as { at: number; z: number };
    const b = sorted[i] as { at: number; z: number };
    if (scroll <= b.at) {
      const t = b.at === a.at ? 1 : (scroll - a.at) / (b.at - a.at);
      return a.z + (b.z - a.z) * t * t * (3 - 2 * t);
    }
  }
  return (sorted[sorted.length - 1] as { at: number; z: number }).z;
}

/** On a narrow screen objects move in towards the centre so they stay in view. */
export function lateralScale(aspect: number): number {
  return Math.max(0.42, Math.min(1, aspect / 1.4));
}
