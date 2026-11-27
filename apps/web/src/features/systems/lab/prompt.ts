import type { TFunction } from "i18next";
import type { Grade } from "./grade";
import type { Design } from "./model";

export type ReviewInput = {
  title: string;
  brief: string;
  requirements: readonly string[];
  design: Design;
  /** The general check results, when the learner has run them. */
  result?: Grade | null;
};

type PromptKey =
  | "role"
  | "problem"
  | "titleLabel"
  | "untitled"
  | "noBrief"
  | "requirementsLabel"
  | "noRequirements"
  | "design"
  | "emptyDesign"
  | "boxes"
  | "connections"
  | "noConnections"
  | "checks"
  | "pass"
  | "fail"
  | "na"
  | "asks"
  | "ask1"
  | "ask2"
  | "ask3"
  | "ask4"
  | "ask5"
  | "assume";

const ASKS = ["ask1", "ask2", "ask3", "ask4", "ask5"] as const;

/**
 * The text a learner pastes into an AI assistant to have their design reviewed: the problem,
 * the design written out in words, what the automatic checks found, and what to look at.
 * Every fixed line comes from en.json, so the prompt can be translated with the rest.
 */
export function buildReviewPrompt(input: ReviewInput, t: TFunction): string {
  const P = (key: PromptKey, values?: Record<string, unknown>) =>
    t(`lab.own.prompt.${key}`, values ?? {});
  const byId = new Map(input.design.nodes.map((n) => [n.id, n]));
  const lines: string[] = [P("role"), ""];

  lines.push(`## ${P("problem")}`);
  lines.push(`${P("titleLabel")}: ${input.title.trim() || P("untitled")}`);
  lines.push("", input.brief.trim() || P("noBrief"));
  lines.push("", `${P("requirementsLabel")}:`);
  if (input.requirements.length === 0) lines.push(`- ${P("noRequirements")}`);
  for (const r of input.requirements) lines.push(`- ${r}`);

  lines.push("", `## ${P("design")}`);
  if (input.design.nodes.length === 0) {
    lines.push(P("emptyDesign"));
  } else {
    lines.push(`${P("boxes")}:`);
    input.design.nodes.forEach((n, i) => {
      lines.push(`${i + 1}. ${n.label} (${t(`lab.kind.${n.kind}`)})`);
    });
    lines.push("", `${P("connections")}:`);
    if (input.design.links.length === 0) lines.push(`- ${P("noConnections")}`);
    for (const l of input.design.links) {
      const from = byId.get(l.from)?.label ?? l.from;
      const to = byId.get(l.to)?.label ?? l.to;
      lines.push(`- ${from} → ${to} (${t(`lab.mode.${l.mode}`)})`);
    }
  }

  if (input.result) {
    lines.push("", `## ${P("checks", { score: input.result.score })}`);
    for (const r of input.result.results) {
      const mark = !r.applies ? P("na") : r.passed ? P("pass") : P("fail");
      lines.push(`- [${mark}] ${r.check.label}`);
    }
  }

  lines.push("", `## ${P("asks")}`);
  for (const key of ASKS) lines.push(P(key));
  lines.push("", P("assume"));
  return lines.join("\n");
}
