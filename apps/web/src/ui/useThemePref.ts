import { useSyncExternalStore } from "react";
import { getThemePref, subscribeThemePref, type ThemePref } from "./theme";

export function useThemePref(): ThemePref {
  return useSyncExternalStore(subscribeThemePref, getThemePref, getThemePref);
}
