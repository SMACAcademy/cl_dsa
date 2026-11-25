import { useEffect } from "react";
import { useLocation } from "react-router";

/** "Recursion & divide and conquer" → "recursion-and-divide-and-conquer". */
export const slug = (text: string) =>
  text
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/** Scrolls to the element named by the URL's #hash once the page has rendered. */
export function useScrollToHash() {
  const { hash } = useLocation();
  useEffect(() => {
    if (!hash) return;
    const el = document.getElementById(decodeURIComponent(hash.slice(1)));
    el?.scrollIntoView?.({ block: "start" });
  }, [hash]);
}
