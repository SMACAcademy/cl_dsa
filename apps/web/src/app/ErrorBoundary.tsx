import { TriangleAlert } from "lucide-react";
import { Component, useEffect, type ErrorInfo, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useRouteError } from "react-router";

/** The friendly "something went wrong" panel shared by both boundaries. */
export function ErrorFallback() {
  const { t } = useTranslation();
  return (
    <div
      role="alert"
      className="mx-auto my-12 flex max-w-lg flex-col items-center gap-3 rounded-panel border border-line bg-raised px-6 py-10 text-center"
    >
      <TriangleAlert className="size-8 text-accent-ink" aria-hidden="true" />
      <h1 className="text-xl font-semibold">{t("error.title")}</h1>
      <p className="text-muted">{t("error.body")}</p>
      <div className="mt-2 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="inline-flex h-9 items-center rounded-control bg-accent-solid px-4 text-sm font-medium text-on-accent hover:opacity-90"
        >
          {t("error.reload")}
        </button>
        {/* A full navigation (not a router link) so a broken router state is discarded too. */}
        <a
          href="/"
          className="inline-flex h-9 items-center rounded-control border border-line px-4 text-sm font-medium hover:bg-sunken"
        >
          {t("error.home")}
        </a>
      </div>
    </div>
  );
}

/** Route-level boundary (`errorElement`): a crashing screen keeps the shell around it. */
export function RouteErrorFallback() {
  const error = useRouteError();
  useEffect(() => {
    console.error(error);
  }, [error]);
  return <ErrorFallback />;
}

type Props = { children: ReactNode };
type State = { failed: boolean };

/** Last-resort boundary around the whole app, for errors outside any route. */
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error(error, info.componentStack);
  }

  override render() {
    return this.state.failed ? <ErrorFallback /> : this.props.children;
  }
}
