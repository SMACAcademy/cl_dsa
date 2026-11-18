import { BookOpen, Settings, type LucideIcon } from "lucide-react";
import { NAV_ITEMS, type SectionId } from "../../app/nav";

export type PlaceholderId = SectionId | "settings" | "lesson";

/**
 * The phase in which each screen gets its real content (PRD §9 feature-to-phase map,
 * ROADMAP §2–3). Dashboard, Universe and Curriculum v0 land later in Phase 2 (M2.6, T16/T17).
 */
export const SECTION_PHASE: Record<PlaceholderId, number> = {
  dashboard: 2, // M14, Dashboard v0 in M2.6
  universe: 2, // M2, Universe v0 in M2.6
  curriculum: 2, // Phase 2 acceptance: fixture curriculum renders
  algorithms: 4, // M7, Time Machine basic in M4.6 (Arena: phase 6)
  structures: 5, // M8, DS Lab
  playground: 4, // M6, Playground v1 in M4.6
  problems: 4, // M12, ~20 problems for Pyramid I
  projects: 9, // M13
  progress: 4, // My Progress v0 in M4.6
  library: 4, // M15, Library v1 in M4.6 (Explorer: phase 5)
  settings: 4, // daily goal, playback and data settings arrive with M4.3/M4.6
  lesson: 4, // M3, Lesson engine M4.1
};

export const SECTION_ICON: Record<PlaceholderId, LucideIcon> = {
  ...(Object.fromEntries(NAV_ITEMS.map((item) => [item.id, item.icon])) as Record<
    SectionId,
    LucideIcon
  >),
  settings: Settings,
  lesson: BookOpen,
};
