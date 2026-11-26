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
import {
  CHAT_HISTORY,
  CODING_CONTEST,
  ELECTION_NIGHT,
  IOT_SENSORS,
  ORDER_WEBHOOKS,
  SUPPORT_TICKETS,
} from "./batch7";
import {
  API_KEYS,
  DAILY_DEPLOYS,
  LOGIN_ATTACK,
  MONOLITH_SPLIT,
  PASSWORD_MANAGER,
  RECOMMENDATIONS,
  VIDEO_PLATFORM,
} from "./batch8";
import {
  CYCLONE_WARNING,
  FEATURE_FLAGS,
  GAME_LEADERBOARD,
  PODCAST_HIT,
  PRODUCT_CATALOGUE,
  STOCK_TICKER,
} from "./batch9";
import {
  BANKING_SESSIONS,
  EXAM_PROCTORING,
  MESSAGING_APP,
  MOBILE_OLD_VERSIONS,
  MULTI_REGION_READS,
  ORDER_FULFILMENT,
  REPORT_EXPORTS,
} from "./batch10";
import {
  JOB_SCHEDULER,
  LEGAL_DOCUMENTS,
  NEWSLETTER,
  SEARCH_DEPENDENCY,
  SHOPPING_LIST,
  TAX_DEADLINE,
  WEBINAR_SIGNUP,
} from "./batch11";
import {
  ADMIN_ROLES,
  DATA_WAREHOUSE,
  MAPS_NAVIGATION,
  ONCALL_ALERTS,
  RISKY_LAUNCH,
  SERVICE_MESH,
} from "./batch12";
import {
  HOTEL_ROOMS,
  MOBILE_GATEWAY,
  NEARBY_SEARCH,
  PHOTO_CONTEST,
  RESTAURANT_REVIEWS,
  RIDE_TRIP,
} from "./batch13";
import {
  DR_DRILL,
  NOTIFICATION_PREFS,
  SEARCH_INDEXING,
  SOCIAL_NETWORK,
  STREAMING_OUTAGE,
  TAX_SERVICE,
  UPLOAD_SCANNING,
} from "./batch14";
import {
  AUTOCOMPLETE,
  LIVE_COMMENTS,
  LOYALTY_POINTS,
  MARATHON_TRACKING,
  PARCEL_TRACKING,
  PARTNER_API_LIMITS,
  USERNAME_SIGNUP,
} from "./batch15";
import {
  AD_CLICKS,
  CACHE_STAMPEDE,
  LOAD_TEST,
  LOAN_APPLICATION,
  SECRETS_VAULT,
  TICKETING_PLATFORM,
} from "./batch16";
import { CLAIMS_FILES, MOBILE_BANKING_CORE, ORDERS_STRANGLER } from "./batch17";
import {
  AI_CLAIMS_DESK,
  HELP_CENTRE_ASSISTANT,
  INVOICE_INTAKE,
  REBOOKING_AGENT,
  WIKI_ASSISTANT,
} from "./batch18";

/** Within a checkpoint, studies appear in this order: smaller combinations first. */
const ALL: readonly CaseStudy[] = [
  EXAM_RESULTS_DAY,
  CRICKET_SCORES,
  COURSE_REGISTRATION,
  ELECTION_NIGHT,
  CYCLONE_WARNING,
  TAX_DEADLINE,
  PHOTO_CONTEST,
  BREAKING_NEWS,
  RECIPE_BLOG,
  DOCS_SITE,
  PODCAST_HIT,
  WEBINAR_SIGNUP,
  RESTAURANT_REVIEWS,
  MARATHON_TRACKING,
  FESTIVAL_GROCERY,
  GAME_LAUNCH,
  CODING_CONTEST,
  EXAM_RESULTS_SCALED,
  HOSPITAL_APPOINTMENTS,
  LIBRARY_CATALOGUE,
  BANK_LEDGER,
  TRAIN_BOOKING,
  WAREHOUSE_INVENTORY,
  PHOTO_BACKUP,
  SAAS_TENANTS,
  CHAT_HISTORY,
  IOT_SENSORS,
  PRODUCT_CATALOGUE,
  AUTOCOMPLETE,
  GAME_LEADERBOARD,
  FEATURE_FLAGS,
  SHOPPING_LIST,
  LEGAL_DOCUMENTS,
  USERNAME_SIGNUP,
  JOB_SCHEDULER,
  HOTEL_ROOMS,
  NEARBY_SEARCH,
  LOYALTY_POINTS,
  KV_STORE,
  RIDE_LOCATIONS,
  LIVE_AUCTION,
  WHITEBOARD,
  MULTIPLAYER_QUIZ,
  PUSH_NOTIFICATIONS,
  ORDER_WEBHOOKS,
  PARCEL_TRACKING,
  SUPPORT_TICKETS,
  STOCK_TICKER,
  LIVE_COMMENTS,
  REPORT_EXPORTS,
  NEWSLETTER,
  RIDE_TRIP,
  FOOD_ORDERS,
  COURSE_VIDEOS,
  STATUS_PAGE,
  PUBLIC_API,
  SMS_OTP,
  LOGIN_ATTACK,
  MULTI_REGION_READS,
  SEARCH_DEPENDENCY,
  CACHE_STAMPEDE,
  ONCALL_ALERTS,
  MOBILE_GATEWAY,
  STREAMING_OUTAGE,
  TAX_SERVICE,
  PARTNER_API_LIMITS,
  PAYMENTS,
  CLICKSTREAM,
  AD_CLICKS,
  TRAVEL_SAGA,
  FRAUD_DETECTION,
  RECOMMENDATIONS,
  MONOLITH_SPLIT,
  ORDER_FULFILMENT,
  LOAN_APPLICATION,
  DATA_WAREHOUSE,
  SERVICE_MESH,
  SEARCH_INDEXING,
  NOTIFICATION_PREFS,
  MARKETPLACE_CHECKOUT,
  HEALTH_RECORDS,
  FILE_SHARING,
  PASSWORD_MANAGER,
  API_KEYS,
  EXAM_PROCTORING,
  BANKING_SESSIONS,
  ADMIN_ROLES,
  SECRETS_VAULT,
  UPLOAD_SCANNING,
  SCHOOL_SSO,
  ZERO_DOWNTIME_MIGRATION,
  DAILY_DEPLOYS,
  LOAD_TEST,
  MOBILE_OLD_VERSIONS,
  RISKY_LAUNCH,
  DR_DRILL,
  ALGOVERSE_CAPSTONE,
  VIDEO_PLATFORM,
  MESSAGING_APP,
  MAPS_NAVIGATION,
  SOCIAL_NETWORK,
  TICKETING_PLATFORM,
  MOBILE_BANKING_CORE,
  CLAIMS_FILES,
  ORDERS_STRANGLER,
  WIKI_ASSISTANT,
  HELP_CENTRE_ASSISTANT,
  INVOICE_INTAKE,
  REBOOKING_AGENT,
  AI_CLAIMS_DESK,
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
