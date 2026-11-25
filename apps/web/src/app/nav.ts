import {
  ChartPie,
  FlaskConical,
  Hammer,
  LayoutDashboard,
  LibraryBig,
  ListTree,
  Network,
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
 * The left nav rail, in the order of UI_UX §2, plus the System Design Lab after the two
 * labs it builds on. Settings lives under the avatar menu.
 */
export const NAV_ITEMS: readonly NavItem[] = [
  { id: "dashboard", path: "/", labelKey: "nav.dashboard", icon: LayoutDashboard },
  { id: "universe", path: "/universe", labelKey: "nav.universe", icon: Triangle },
  { id: "curriculum", path: "/curriculum", labelKey: "nav.curriculum", icon: ListTree },
  { id: "algorithms", path: "/algorithms", labelKey: "nav.algorithms", icon: FlaskConical },
  { id: "structures", path: "/structures", labelKey: "nav.structures", icon: Network },
  { id: "systems", path: "/systems", labelKey: "nav.systems", icon: Server },
  { id: "playground", path: "/playground", labelKey: "nav.playground", icon: SquareTerminal },
  { id: "problems", path: "/problems", labelKey: "nav.problems", icon: Puzzle },
  { id: "projects", path: "/projects", labelKey: "nav.projects", icon: Hammer },
  { id: "progress", path: "/progress", labelKey: "nav.progress", icon: ChartPie },
  { id: "library", path: "/library", labelKey: "nav.library", icon: LibraryBig },
];

export const SETTINGS_PATH = "/settings";
