import { describe, expect, it } from "vitest";
import { staticPages } from "../src/app/staticPages";
import { CATALOG, itemPath } from "../src/features/catalog/catalog";
import { CASES } from "../src/features/systems/cases";
import { LAB_PROBLEMS } from "../src/features/systems/lab/problems";
import { LESSONS } from "../src/features/systems/lessons";

describe("pages written for GitHub Pages", () => {
  const pages = staticPages();
  const paths = pages.map((p) => p.path);

  it("cover the landing page, every section and every piece of content, once each", () => {
    expect(new Set(paths).size).toBe(paths.length);
    for (const p of ["/", "/home", "/systems", "/systems/lab", "/about", "/settings"]) {
      expect(paths).toContain(p);
    }
    for (const i of CATALOG) expect(paths).toContain(itemPath(i));
    for (const l of LESSONS) expect(paths).toContain(`/systems/${l.id}`);
    for (const c of CASES) expect(paths).toContain(`/systems/case/${c.id}`);
    for (const p of LAB_PROBLEMS) expect(paths).toContain(`/systems/lab/${p.id}`);
  });

  it("give every page a real title", () => {
    for (const p of pages) {
      expect(p.title, p.path).toMatch(/^.+ · AlgoVerse$/);
      expect(p.title, p.path).not.toContain("{{");
    }
    expect(pages.find((p) => p.path === "/systems/rag")?.title).toBe(
      "Answering from your own documents · AlgoVerse",
    );
  });

  it("use simple paths that are safe as file names", () => {
    for (const p of paths) expect(p).toMatch(/^\/[a-z0-9/-]*$/);
  });
});
