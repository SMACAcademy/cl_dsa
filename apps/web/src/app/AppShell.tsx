import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Outlet, useLocation } from "react-router";
import { getThemePref, resolveTheme, setThemePref, watchSystemTheme } from "../ui/theme";
import { UpdatePrompt } from "../ui/UpdatePrompt";
import { NavRail } from "./NavRail";
import { SiteFooter } from "./SiteFooter";
import { TopBar } from "./TopBar";

/** Ctrl+Alt+T flips between light and dark (UI_UX §5). */
function useThemeShortcut() {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.altKey && event.key.toLowerCase() === "t") {
        event.preventDefault();
        setThemePref(resolveTheme(getThemePref()) === "dark" ? "light" : "dark");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}

/**
 * After client-side navigation, start the new page at the top and move focus to it so screen
 * readers announce it. Comparing paths (not a "first run" flag) keeps StrictMode's double effect
 * from stealing focus on the initial load.
 */
function useFocusMainOnNavigate(main: React.RefObject<HTMLElement | null>) {
  const { pathname } = useLocation();
  const previous = useRef(pathname);
  useEffect(() => {
    if (previous.current === pathname) return;
    previous.current = pathname;
    window.scrollTo({ top: 0 });
    main.current?.focus({ preventScroll: true });
  }, [pathname, main]);
}

export function AppShell() {
  const { t } = useTranslation();
  const main = useRef<HTMLElement>(null);
  useThemeShortcut();
  useFocusMainOnNavigate(main);
  useEffect(() => watchSystemTheme(), []);

  return (
    <div className="flex min-h-dvh">
      <a
        href="#main"
        className="sr-only z-50 rounded-control bg-accent-solid px-4 py-2 text-sm font-medium text-on-accent focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        {t("a11y.skipToContent")}
      </a>
      <NavRail />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main id="main" ref={main} tabIndex={-1} className="flex-1 px-4 py-8 outline-none sm:px-8">
          <div className="mx-auto w-full max-w-6xl">
            <Outlet />
          </div>
        </main>
        <SiteFooter />
      </div>
      <UpdatePrompt />
    </div>
  );
}
