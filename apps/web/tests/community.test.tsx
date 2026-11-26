import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CREATOR } from "../src/branding";
import {
  CHALLENGE_EPOCH,
  CHALLENGES,
  COMMUNITY,
  newDiscussionUrl,
  newIssueUrl,
  weeklyChallenge,
} from "../src/features/community/community";
import { CASES } from "../src/features/systems/cases";
import { renderRoute } from "./render";

const WEEK = 7 * 24 * 60 * 60 * 1000;

describe("Community: challenges and GitHub links", () => {
  it("every case study has exactly one open design question", () => {
    expect(Object.keys(CHALLENGES).sort()).toEqual(CASES.map((c) => c.id).sort());
    for (const [id, q] of Object.entries(CHALLENGES)) {
      expect(q.length, id).toBeGreaterThan(40);
      expect(q.trim().endsWith("?") || q.trim().endsWith("."), id).toBe(true);
    }
  });

  it("the weekly challenge rotates through every question, one per week", () => {
    const ids = Object.keys(CHALLENGES);
    expect(weeklyChallenge(CHALLENGE_EPOCH)).toMatchObject({ number: 1, caseId: ids[0] });
    expect(weeklyChallenge(CHALLENGE_EPOCH + WEEK - 1).number).toBe(1);
    expect(weeklyChallenge(CHALLENGE_EPOCH + WEEK)).toMatchObject({ number: 2, caseId: ids[1] });
    expect(weeklyChallenge(CHALLENGE_EPOCH + ids.length * WEEK).caseId).toBe(ids[0]);
    // Before the first Monday, show challenge 1 rather than a negative week.
    expect(weeklyChallenge(CHALLENGE_EPOCH - 3 * WEEK).number).toBe(1);
  });

  it("builds discussion and issue links on the project's repository", () => {
    const url = new URL(newDiscussionUrl("q-a", "A title & more", "Body"));
    expect(url.origin + url.pathname).toBe(`${CREATOR.github}/discussions/new`);
    expect(url.searchParams.get("category")).toBe("q-a");
    expect(url.searchParams.get("title")).toBe("A title & more");
    expect(url.searchParams.get("body")).toBe("Body");
    const issue = new URL(newIssueUrl("content-fix.yml", "[cdn] "));
    expect(issue.searchParams.get("template")).toBe("content-fix.yml");
    expect(issue.searchParams.get("title")).toBe("[cdn] ");
  });

  it("a case study ends with its open question and ways to join in", async () => {
    const cs = CASES[0];
    if (!cs) throw new Error("no case studies");
    renderRoute(`/systems/case/${cs.id}`);
    const section = (await screen.findByRole("heading", { name: /Your turn/ })).closest("section");
    if (!section) throw new Error("no Your turn section");
    const panel = within(section);
    expect(panel.getByText(CHALLENGES[cs.id] as string)).toBeVisible();
    const share = panel.getByRole("link", { name: "Share your answer" });
    expect(share.getAttribute("href")).toContain(`${CREATOR.github}/discussions/new?category=q-a`);
    expect(
      panel.getByRole("link", { name: "Suggest an improvement" }).getAttribute("href"),
    ).toContain("template=content-fix.yml");
    expect(
      panel.getByRole("link", { name: "Propose a case study" }).getAttribute("href"),
    ).toContain("template=case-study-idea.yml");
  });

  it("a lesson invites questions without a case-study prompt", async () => {
    renderRoute("/systems/caching");
    const section = (
      await screen.findByRole("heading", { name: "Questions about this lesson?" })
    ).closest("section");
    if (!section) throw new Error("no questions section");
    expect(within(section).getByRole("link", { name: "Ask on GitHub" })).toBeVisible();
    expect(within(section).queryByRole("link", { name: "Propose a case study" })).toBeNull();
  });

  it("the System Design Lab shows this week's challenge", async () => {
    renderRoute("/systems");
    const { number, question } = weeklyChallenge();
    expect(await screen.findByText(question)).toBeVisible();
    expect(screen.getByText(`Design challenge #${number} · this week`)).toBeVisible();
    expect(screen.getByRole("link", { name: "See everyone's answers" })).toHaveAttribute(
      "href",
      COMMUNITY.challenges,
    );
  });

  it("every page has a quiet footer with the credit and project links", async () => {
    renderRoute("/algorithms");
    await screen.findByRole("heading", { level: 1, name: "Algorithm Lab" });
    const footer = within(screen.getByRole("contentinfo"));
    expect(footer.getByText(CREATOR.name)).toBeVisible();
    expect(footer.getByRole("link", { name: "Discussions" })).toHaveAttribute(
      "href",
      COMMUNITY.discussions,
    );
    expect(footer.getByRole("link", { name: "Contribute" })).toHaveAttribute(
      "href",
      COMMUNITY.contributing,
    );
  });
});
