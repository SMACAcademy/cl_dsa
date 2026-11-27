import { slug } from "../../lib/slug";
import { CATALOG, groupItems, itemPath, type CatalogItem } from "../catalog/catalog";
import { MODULES } from "../systems/lessons";
import type { Lesson } from "../systems/model";

/** A topic on the maps: a catalog group, a system design module, or a whole section. */
export type Topic = {
  id: string;
  /** Short label for a pyramid tile (two short lines at most). */
  short: string;
  title: string;
  /** Where clicking the topic goes. */
  path: string;
  /** Pages inside the topic, each with its own path, for progress and the curriculum. */
  pages: readonly { path: string; title: string; minutes: number }[];
};

const SHORT: Record<string, string> = {
  Searching: "Searching",
  "Linear structures": "Lists & queues",
  Sorting: "Sorting",
  "Recursion & divide and conquer": "Recursion",
  Hashing: "Hashing",
  Trees: "Trees",
  "Problem-solving patterns": "Patterns",
  "Strings & numbers": "Strings",
  "Designed structures": "LRU & Bloom",
  "Graphs & sets": "Graphs",
  "Graph algorithms": "Graph algos",
  "Greedy algorithms": "Greedy",
  "Dynamic programming": "DP",
  Backtracking: "Backtrack",
};

const catalogTopic = (group: string, items: readonly CatalogItem[]): Topic => {
  const first = items[0] as CatalogItem;
  const list = first.kind === "algorithm" ? "/algorithms" : "/structures";
  return {
    id: `group-${slug(group)}`,
    short: SHORT[group] ?? group,
    title: group,
    path: `${list}#${slug(group)}`,
    pages: items.map((i) => ({ path: itemPath(i), title: i.name, minutes: 6 })),
  };
};

const GROUPS = new Map(groupItems(CATALOG).map((g) => [g.group, g.items]));
const group = (name: string): Topic => catalogTopic(name, GROUPS.get(name) ?? []);

const moduleTopic = (id: string): Topic => {
  const m = MODULES.find((x) => x.id === id);
  const lessons: readonly Lesson[] = m?.lessons ?? [];
  return {
    id: `module-${id}`,
    short: m?.title ?? id,
    title: m ? `System design: ${m.title}` : id,
    path: `/systems#${id}`,
    pages: lessons.map((l) => ({ path: `/systems/${l.id}`, title: l.title, minutes: l.minutes })),
  };
};

/**
 * The pyramid, top to bottom: each row is wider and builds on the rows above.
 * Rows have 1, 3, 5, 7 and 9 tiles.
 */
export const PYRAMID: readonly (readonly Topic[])[] = [
  [group("Searching")],
  [group("Linear structures"), group("Sorting"), group("Recursion & divide and conquer")],
  [
    group("Hashing"),
    group("Trees"),
    group("Problem-solving patterns"),
    group("Strings & numbers"),
    group("Designed structures"),
  ],
  [
    group("Graphs & sets"),
    group("Graph algorithms"),
    group("Greedy algorithms"),
    group("Dynamic programming"),
    group("Backtracking"),
    moduleTopic("foundations"),
    moduleTopic("scaling"),
  ],
  [
    moduleTopic("data"),
    moduleTopic("communication"),
    moduleTopic("reliability"),
    moduleTopic("architecture"),
    moduleTopic("security"),
    moduleTopic("shipping"),
    moduleTopic("whole"),
    {
      id: "playground",
      short: "Playground",
      title: "Python Playground",
      path: "/playground",
      pages: [],
    },
    {
      id: "projects",
      short: "Projects",
      title: "Real-World Projects",
      path: "/projects",
      pages: [],
    },
  ],
];

/** The pyramid rows as named stages, for the curriculum. */
export const STAGES: readonly { key: string; topics: readonly Topic[] }[] = [
  { key: "stage1", topics: [...(PYRAMID[0] ?? []), ...(PYRAMID[1] ?? [])] },
  { key: "stage2", topics: PYRAMID[2] ?? [] },
  { key: "stage3", topics: (PYRAMID[3] ?? []).filter((t) => t.id.startsWith("group-")) },
  {
    key: "stage4",
    topics: [
      ...[...(PYRAMID[3] ?? []), ...(PYRAMID[4] ?? [])].filter((t) => t.id.startsWith("module-")),
      // Newer modules that sit beyond the pyramid's fixed shape.
      moduleTopic("legacy"),
      moduleTopic("ai"),
    ],
  },
];

/** Share of a topic's pages this browser has opened or finished (0..1). */
export function topicProgress(topic: Topic, seen: (path: string) => boolean): number {
  if (topic.pages.length === 0) return 0;
  return topic.pages.filter((p) => seen(p.path)).length / topic.pages.length;
}
