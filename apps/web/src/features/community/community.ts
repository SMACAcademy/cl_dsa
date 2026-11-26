/**
 * Links that invite people into the project on GitHub: discussions, issues and pull requests.
 * The weekly design challenge rotates through `challenges.json`; the scheduled workflow
 * `.github/workflows/weekly-challenge.yml` uses the same order and start date, so the app and
 * the posted discussion always agree.
 */
import { CREATOR } from "../../branding";
import challenges from "./challenges.json";

export const CHALLENGES: Readonly<Record<string, string>> = challenges;

/** Monday 30 November 2026, 00:00 UTC: challenge number 1. */
export const CHALLENGE_EPOCH = Date.UTC(2026, 10, 30);
const WEEK = 7 * 24 * 60 * 60 * 1000;

export type WeeklyChallenge = { number: number; caseId: string; question: string };

/** The challenge for the week containing `now` (weeks start on Monday, UTC). */
export function weeklyChallenge(now: number = Date.now()): WeeklyChallenge {
  const ids = Object.keys(CHALLENGES);
  const week = Math.max(0, Math.floor((now - CHALLENGE_EPOCH) / WEEK));
  const caseId = ids[week % ids.length] as string;
  return { number: week + 1, caseId, question: CHALLENGES[caseId] as string };
}

const repo = CREATOR.github;

/** Discussion categories that exist on the repository (GitHub's defaults). */
export type DiscussionCategory = "q-a" | "ideas" | "show-and-tell" | "general";

export function newDiscussionUrl(category: DiscussionCategory, title: string, body = ""): string {
  const query = new URLSearchParams({ category, title });
  if (body) query.set("body", body);
  return `${repo}/discussions/new?${query.toString()}`;
}

export function newIssueUrl(template: string, title: string): string {
  return `${repo}/issues/new?${new URLSearchParams({ template, title }).toString()}`;
}

export const COMMUNITY = {
  discussions: `${repo}/discussions`,
  challenges: `${repo}/discussions/categories/q-a`,
  contributing: `${repo}/blob/main/CONTRIBUTING.md`,
  goodFirstIssues: `${repo}/issues?q=is%3Aopen+label%3A%22good+first+issue%22`,
} as const;
