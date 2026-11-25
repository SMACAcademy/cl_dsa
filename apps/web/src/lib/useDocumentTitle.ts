import { useEffect } from "react";
import { useTranslation } from "react-i18next";

/** Sets `document.title` to "<section> · AlgoVerse" while the calling screen is mounted. */
export function useDocumentTitle(section: string): void {
  const { t } = useTranslation();
  useEffect(() => {
    document.title = t("app.documentTitle", { section });
  }, [section, t]);
}
