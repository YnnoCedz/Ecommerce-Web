import { Suspense } from "react";
import { RouterProvider } from "react-router";
import { router } from "./router";

export default function App() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[var(--color-ground)] px-6">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="h-10 w-10 rounded-full border-2 border-[var(--color-navy)] border-t-transparent animate-spin" />
            <p className="text-sm text-[var(--color-ink-muted)]">Loading Marketo...</p>
          </div>
        </div>
      }
    >
      <RouterProvider router={router} />
    </Suspense>
  );
}
