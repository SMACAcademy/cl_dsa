import "@testing-library/jest-dom/vitest";
import { cleanup, configure } from "@testing-library/react";
import * as axeMatchers from "vitest-axe/matchers";
import { afterEach, expect } from "vitest";
import i18n from "../src/lib/i18n";

expect.extend(axeMatchers);

// Pages load lazily. Under a full parallel run a lazy page can take just over the
// default 1 s to appear, so findBy* waits up to 5 s (passing tests are no slower).
configure({ asyncUtilTimeout: 5000 });

const hasDom = typeof window !== "undefined";

if (hasDom) document.documentElement.lang = "en";

// jsdom implements neither matchMedia nor ResizeObserver (Radix popovers use the latter).
if (hasDom && !window.matchMedia) {
  window.matchMedia = (query: string): MediaQueryList =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
    }) as MediaQueryList;
}
if (hasDom && !("ResizeObserver" in window)) {
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  Object.assign(window, { ResizeObserver: ResizeObserverStub });
}

// axe probes canvas for icon-font checks; jsdom has none and logs noisily without this stub.
if (hasDom) HTMLCanvasElement.prototype.getContext = () => null;
if (hasDom) window.scrollTo = () => undefined;

// Every rendered string must come from en.json: a missing key fails the test that used it.
const missingKeys: string[] = [];
i18n.options.saveMissing = true;
i18n.options.missingKeyHandler = (_lngs, _ns, key) => {
  missingKeys.push(key);
};

afterEach(() => {
  if (hasDom) {
    cleanup();
    try {
      window.localStorage.clear();
    } catch {
      // ignore: some tests stub storage to throw
    }
    delete document.documentElement.dataset.theme;
  }
  const missing = missingKeys.splice(0);
  expect(missing, "translation keys missing from en.json").toEqual([]);
});
