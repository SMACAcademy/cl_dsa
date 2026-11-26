import { LESSONS, MODULES } from "../lessons";
import type { CaseStudy, Lesson, Module } from "../model";
import {
  EXAM_RESULTS_DAY,
  EXAM_RESULTS_SCALED,
  LIBRARY_CATALOGUE,
  RECIPE_BLOG,
  RIDE_LOCATIONS,
  TRAIN_BOOKING,
} from "./batch1";
import {
  ALGOVERSE_CAPSTONE,
  COURSE_VIDEOS,
  FOOD_ORDERS,
  MARKETPLACE_CHECKOUT,
  PAYMENTS,
  SCHOOL_SSO,
} from "./batch2";
import {
  BANK_LEDGER,
  BREAKING_NEWS,
  CRICKET_SCORES,
  FESTIVAL_GROCERY,
  HOSPITAL_APPOINTMENTS,
  KV_STORE,
} from "./batch3";
import {
  CLICKSTREAM,
  HEALTH_RECORDS,
  LIVE_AUCTION,
  PUBLIC_API,
  STATUS_PAGE,
  WHITEBOARD,
} from "./batch4";
import {
  COURSE_REGISTRATION,
  DOCS_SITE,
  GAME_LAUNCH,
  PHOTO_BACKUP,
  SAAS_TENANTS,
  WAREHOUSE_INVENTORY,
} from "./batch5";
import {
  FILE_SHARING,
  FRAUD_DETECTION,
  MULTIPLAYER_QUIZ,
  PUSH_NOTIFICATIONS,
  SMS_OTP,
  TRAVEL_SAGA,
  ZERO_DOWNTIME_MIGRATION,
} from "./batch6";

/** Within a checkpoint, studies appear in this order: smaller combinations first. */
const ALL: readonly CaseStudy[] = [
  EXAM_RESULTS_DAY,
  CRICKET_SCORES,
  COURSE_REGISTRATION,
  BREAKING_NEWS,
  RECIPE_BLOG,
  DOCS_SITE,
  FESTIVAL_GROCERY,
  GAME_LAUNCH,
  EXAM_RESULTS_SCALED,
  HOSPITAL_APPOINTMENTS,
  LIBRARY_CATALOGUE,
  BANK_LEDGER,
  TRAIN_BOOKING,
  WAREHOUSE_INVENTORY,
  PHOTO_BACKUP,
  SAAS_TENANTS,
  KV_STORE,
  RIDE_LOCATIONS,
  LIVE_AUCTION,
  WHITEBOARD,
  MULTIPLAYER_QUIZ,
  PUSH_NOTIFICATIONS,
  FOOD_ORDERS,
  COURSE_VIDEOS,
  STATUS_PAGE,
  PUBLIC_API,
  SMS_OTP,
  PAYMENTS,
  CLICKSTREAM,
  TRAVEL_SAGA,
  FRAUD_DETECTION,
  MARKETPLACE_CHECKOUT,
  HEALTH_RECORDS,
  FILE_SHARING,
  SCHOOL_SSO,
  ZERO_DOWNTIME_MIGRATION,
  ALGOVERSE_CAPSTONE,
];

const moduleIndexOf = (lessonId: string) =>
  MODULES.findIndex((m) => m.lessons.some((l) => l.id === lessonId));

/**
 * The module after which a case study unlocks: the latest module any of its
 * concepts comes from. A case study only ever combines ideas already learned.
 */
export function checkpointOf(c: CaseStudy): Module {
  const last = Math.max(...c.concepts.map(moduleIndexOf));
  return MODULES[Math.max(last, 0)] as Module;
}

/** Case studies in learning order: by checkpoint, then from smaller to bigger. */
export const CASES: readonly CaseStudy[] = [...ALL].sort(
  (a, b) =>
    MODULES.indexOf(checkpointOf(a)) - MODULES.indexOf(checkpointOf(b)) ||
    ALL.indexOf(a) - ALL.indexOf(b),
);

/** Case studies that unlock after a given module. */
export function casesAfter(moduleId: string): readonly CaseStudy[] {
  return CASES.filter((c) => checkpointOf(c).id === moduleId);
}

export function conceptLessons(c: CaseStudy): readonly Lesson[] {
  return c.concepts
    .map((id) => LESSONS.find((l) => l.id === id))
    .filter((l): l is Lesson => l !== undefined);
}

export function findCase(id: string) {
  const index = CASES.findIndex((c) => c.id === id);
  if (index < 0) return undefined;
  const cs = CASES[index] as CaseStudy;
  return {
    cs,
    index,
    count: CASES.length,
    checkpoint: checkpointOf(cs),
    prev: CASES[index - 1],
    next: CASES[index + 1],
  };
}
