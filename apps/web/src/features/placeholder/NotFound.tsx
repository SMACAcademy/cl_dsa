import { ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import { TriangleLattice } from "../../ui/TriangleLattice";

export function NotFound() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  useDocumentTitle(t("notFound.title"));

  return (
    <div className="relative overflow-hidden rounded-panel border border-line bg-raised">
      <TriangleLattice className="absolute inset-0 text-accent opacity-[0.1]" />
      <div className="relative flex min-h-96 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
        <p aria-hidden="true" className="font-mono text-5xl font-semibold text-accent-ink">
          {t("notFound.code")}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">{t("notFound.title")}</h1>
        <p className="max-w-md text-muted">{t("notFound.body", { path: pathname })}</p>
        <Link
          to="/home"
          className="mt-2 inline-flex h-9 items-center gap-2 rounded-control bg-accent-solid px-4 text-sm font-medium text-on-accent transition-opacity hover:opacity-90"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          {t("notFound.home")}
        </Link>
      </div>
    </div>
  );
}
