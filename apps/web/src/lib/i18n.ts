import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "../locales/en.json";

export const defaultNS = "translation";
export const resources = { en: { translation: en } } as const;

declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: typeof defaultNS;
    resources: (typeof resources)["en"];
  }
}

// Resources are bundled, so initialisation is synchronous: the first render is already translated.
void i18n.use(initReactI18next).init({
  resources,
  lng: "en",
  fallbackLng: "en",
  defaultNS,
  initAsync: false,
  interpolation: { escapeValue: false }, // React escapes already
});

export default i18n;
