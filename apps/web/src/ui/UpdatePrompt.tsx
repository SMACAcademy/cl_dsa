import { RefreshCw, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useRegisterSW } from "virtual:pwa-register/react";

/**
 * PWA toast (ADR-020). Updates now install automatically (`registerType: "autoUpdate"`), so
 * this mostly shows "ready to work offline"; the reload button remains for a waiting worker.
 */
export function UpdatePrompt() {
  const { t } = useTranslation();
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW();

  const close = () => {
    setNeedRefresh(false);
    setOfflineReady(false);
  };

  return (
    <div role="status" aria-live="polite" className="fixed right-4 bottom-4 z-50">
      {(needRefresh || offlineReady) && (
        <div className="flex max-w-sm items-center gap-3 rounded-panel border border-line bg-raised p-4 text-sm shadow-lg shadow-black/10">
          <p className="flex-1">{needRefresh ? t("pwa.updateAvailable") : t("pwa.offlineReady")}</p>
          {needRefresh && (
            <button
              type="button"
              onClick={() => void updateServiceWorker(true)}
              className="inline-flex h-8 items-center gap-1.5 rounded-control bg-accent-solid px-3 font-medium text-on-accent hover:opacity-90"
            >
              <RefreshCw className="size-4" aria-hidden="true" />
              {t("pwa.reload")}
            </button>
          )}
          <button
            type="button"
            onClick={close}
            aria-label={t("pwa.dismiss")}
            className="grid size-8 place-items-center rounded-control text-muted hover:bg-sunken hover:text-fg"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}
