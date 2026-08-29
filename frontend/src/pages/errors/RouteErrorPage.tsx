import { useEffect } from "react";
import { Link, useRouteError } from "react-router";

export default function RouteErrorPage() {
  const error = useRouteError();

  useEffect(() => {
    if (import.meta.env.DEV) {
      console.error("[Maketo:route-error]", error);
    }
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-ground)] px-6 py-12">
      <div className="max-w-md w-full bg-white border border-[var(--color-border)] rounded-sm shadow-[0_4px_24px_rgba(28,27,24,0.08)] p-8 text-center">
        <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-disabled)] tracking-widest uppercase mb-3">
          Maketo
        </p>
        <h1 className="font-[var(--font-display)] text-3xl text-[var(--color-ink)] font-[400] mb-3">
          Something went wrong
        </h1>
        <p className="text-sm text-[var(--color-ink-muted)] leading-relaxed mb-6">
          We couldn't load this page. Please refresh or try again.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex items-center justify-center rounded-sm bg-[var(--color-navy)] px-4 py-2.5 text-sm font-[500] text-white hover:bg-[var(--color-navy-hover)] transition-colors"
          >
            Try again
          </button>
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-sm border border-[var(--color-border)] px-4 py-2.5 text-sm font-[500] text-[var(--color-ink)] hover:bg-[var(--color-surface)] transition-colors"
          >
            Go to homepage
          </Link>
        </div>
      </div>
    </div>
  );
}
