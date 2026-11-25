import type { Lesson, Module } from "../model";
import { INDEXES, REPLICATION, SQL_NOSQL, STORAGE_ENGINES } from "./data1";
import { CAP, CONSISTENT_HASHING, SHARDING, UNIQUE_IDS } from "./data2";
import { CONSENSUS, FILES_MEDIA, TRANSACTIONS } from "./data3";
import { LATENCY_THROUGHPUT, NAPKIN_MATH, REQUEST_JOURNEY } from "./foundations";
import { LOAD_BALANCING } from "./loadBalancing";
import { CACHING, CDN, SCALE_UP_OUT, STATELESS } from "./scaling";

/** Every module in teaching order. Modules without lessons yet are hidden. */
const ALL_MODULES: Module[] = [
  {
    id: "foundations",
    number: "01",
    title: "Foundations",
    blurb: "What happens when a learner opens AlgoVerse, and how to reason about speed and size.",
    lessons: [REQUEST_JOURNEY, LATENCY_THROUGHPUT, NAPKIN_MATH],
  },
  {
    id: "scaling",
    number: "02",
    title: "Scaling",
    blurb: "From one server to many: balancing, statelessness, caches and the edge.",
    lessons: [SCALE_UP_OUT, LOAD_BALANCING, STATELESS, CACHING, CDN],
  },
  {
    id: "data",
    number: "03",
    title: "Data & storage",
    blurb: "Where the data lives, how it is found fast, copied, split and kept correct.",
    lessons: [
      SQL_NOSQL,
      INDEXES,
      STORAGE_ENGINES,
      REPLICATION,
      SHARDING,
      CONSISTENT_HASHING,
      UNIQUE_IDS,
      CAP,
      CONSENSUS,
      TRANSACTIONS,
      FILES_MEDIA,
    ],
  },
  {
    id: "communication",
    number: "04",
    title: "Communication",
    blurb: "How programs ask each other for things, now or later.",
    lessons: [],
  },
  {
    id: "reliability",
    number: "05",
    title: "Reliability",
    blurb: "Everything fails eventually. Designing so that no single failure takes you down.",
    lessons: [],
  },
  {
    id: "architecture",
    number: "06",
    title: "Architecture",
    blurb: "Splitting a system into services, and keeping work correct across them.",
    lessons: [],
  },
  {
    id: "security",
    number: "07",
    title: "Security",
    blurb: "Who you are, what you may do, and keeping secrets secret.",
    lessons: [],
  },
  {
    id: "shipping",
    number: "08",
    title: "Shipping",
    blurb: "Getting changes to learners quickly and safely.",
    lessons: [],
  },
  {
    id: "whole",
    number: "09",
    title: "Whole systems",
    blurb: "Everything together: designing real products end to end.",
    lessons: [],
  },
];

export const MODULES: readonly Module[] = ALL_MODULES.filter((m) => m.lessons.length > 0);
export const LESSONS: readonly Lesson[] = MODULES.flatMap((m) => m.lessons);

export function findLesson(id: string) {
  for (const module of MODULES) {
    const index = module.lessons.findIndex((l) => l.id === id);
    if (index < 0) continue;
    const lesson = module.lessons[index] as Lesson;
    const flat = LESSONS.indexOf(lesson);
    return {
      lesson,
      module,
      index,
      count: module.lessons.length,
      prev: LESSONS[flat - 1],
      next: LESSONS[flat + 1],
    };
  }
  return undefined;
}
