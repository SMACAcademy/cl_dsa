import {
  ChartPie,
  FlaskConical,
  Hammer,
  LayoutDashboard,
  LibraryBig,
  ListTree,
  Network,
  PencilRuler,
  Puzzle,
  Server,
  SquareTerminal,
  Triangle,
  type LucideIcon,
} from "lucide-react";

export type SectionId =
  | "dashboard"
  | "universe"
  | "curriculum"
  | "algorithms"
  | "structures"
  | "systems"
  | "playground"
  | "problems"
  | "projects"
  | "progress"
  | "library";

export interface NavItem {
  readonly id: SectionId;
  readonly path: string;
  readonly labelKey: `nav.${SectionId}`;
  readonly icon: LucideIcon;
}

/**
 * Every section of the app, in menu order. Routes are generated from this list; the dashboard
 * lives at /home because "/" is the landing page. Settings lives under the avatar menu.
 */
export const NAV_ITEMS: readonly NavItem[] = [
  { id: "dashboard", path: "/home", labelKey: "nav.dashboard", icon: LayoutDashboard },
  { id: "universe", path: "/universe", labelKey: "nav.universe", icon: Triangle },
  { id: "curriculum", path: "/curriculum", labelKey: "nav.curriculum", icon: ListTree },
  { id: "structures", path: "/structures", labelKey: "nav.structures", icon: Network },
  { id: "algorithms", path: "/algorithms", labelKey: "nav.algorithms", icon: FlaskConical },
  { id: "systems", path: "/systems", labelKey: "nav.systems", icon: Server },
  { id: "problems", path: "/problems", labelKey: "nav.problems", icon: Puzzle },
  { id: "playground", path: "/playground", labelKey: "nav.playground", icon: SquareTerminal },
  { id: "projects", path: "/projects", labelKey: "nav.projects", icon: Hammer },
  { id: "progress", path: "/progress", labelKey: "nav.progress", icon: ChartPie },
  { id: "library", path: "/library", labelKey: "nav.library", icon: LibraryBig },
];

/** One link in the rail: a section, or a page inside one that deserves its own entry. */
export interface MenuLink {
  readonly key: string;
  readonly path: string;
  readonly labelKey: `nav.${SectionId | "designLab"}`;
  readonly icon: LucideIcon;
}

export type MenuGroupId = "start" | "labs" | "practise" | "you";

export interface MenuGroup {
  readonly id: MenuGroupId;
  readonly labelKey: `nav.groups.${MenuGroupId}`;
  readonly links: readonly MenuLink[];
}

const section = (id: SectionId): MenuLink => {
  const item = NAV_ITEMS.find((i) => i.id === id) as NavItem;
  return { key: item.id, path: item.path, labelKey: item.labelKey, icon: item.icon };
};

/** The rail, in four groups: where to start, the labs, practice, and your own record. */
export const MENU_GROUPS: readonly MenuGroup[] = [
  {
    id: "start",
    labelKey: "nav.groups.start",
    links: [section("dashboard"), section("universe"), section("curriculum")],
  },
  {
    id: "labs",
    labelKey: "nav.groups.labs",
    links: [
      section("structures"),
      section("algorithms"),
      section("systems"),
      { key: "designLab", path: "/systems/lab", labelKey: "nav.designLab", icon: PencilRuler },
    ],
  },
  {
    id: "practise",
    labelKey: "nav.groups.practise",
    links: [section("problems"), section("playground"), section("projects")],
  },
  { id: "you", labelKey: "nav.groups.you", links: [section("progress"), section("library")] },
];

/** The rail link for a page: the longest menu path that the page sits under. */
export function currentMenuPath(pathname: string): string | undefined {
  const all = MENU_GROUPS.flatMap((g) => g.links.map((l) => l.path));
  return all
    .filter((path) => pathname === path || pathname.startsWith(`${path}/`))
    .sort((a, b) => b.length - a.length)[0];
}

export const SETTINGS_PATH = "/settings";
