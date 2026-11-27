/*
 * Every public page of the site, with its title. The production build writes a copy of the
 * app's HTML for each one (see vite.config.ts), so GitHub Pages answers deep links with a real
 * page (HTTP 200) instead of its 404 fallback: search engines index them and link previews work.
 */
import { ALGORITHMS, itemPath, STRUCTURES } from "../features/catalog/catalog";
import { CASES } from "../features/systems/cases";
import { LAB_PROBLEMS } from "../features/systems/lab/problems";
import { LESSONS } from "../features/systems/lessons";
import en from "../locales/en.json" with { type: "json" };
import { NAV_ITEMS } from "./nav";

export type StaticPage = { path: string; title: string };

const titled = (section: string) => en.app.documentTitle.replace("{{section}}", section);

export function staticPages(): StaticPage[] {
  const pages: StaticPage[] = [
    { path: "/", title: titled(en.landing.title) },
    ...NAV_ITEMS.map((item) => ({ path: item.path, title: titled(en.nav[item.id]) })),
    { path: "/about", title: titled(en.about.title) },
    { path: "/settings", title: titled(en.nav.settings) },
    { path: "/systems/lab", title: titled(en.lab.title) },
    ...[...STRUCTURES, ...ALGORITHMS].map((i) => ({ path: itemPath(i), title: titled(i.name) })),
    ...LESSONS.map((l) => ({ path: `/systems/${l.id}`, title: titled(l.title) })),
    ...CASES.map((c) => ({ path: `/systems/case/${c.id}`, title: titled(c.title) })),
    ...LAB_PROBLEMS.map((p) => ({ path: `/systems/lab/${p.id}`, title: titled(p.title) })),
  ];
  const seen = new Set<string>();
  return pages.filter((p) => !seen.has(p.path) && seen.add(p.path));
}
