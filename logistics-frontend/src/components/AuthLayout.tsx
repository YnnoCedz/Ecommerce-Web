import type { ReactNode } from "react"

/**
 * Public / auth shell for the Logistics Partner Portal.
 *
 * Mirrors the Marketplace auth surface: the brand mark and card from
 * frontend/src/pages/auth/AuthLayout.tsx, and the dark footer treatment from
 * frontend/src/shells/PublicShell.tsx. It deliberately carries none of the
 * Marketplace commerce navigation, which is irrelevant here.
 */

export function PublicHeader() {
  return (
    <header className="bg-white border-b border-[var(--color-border)] shadow-[0_1px_0_var(--color-border)]">
      <div className="max-w-screen-xl mx-auto px-4 md:px-6 h-14 flex items-center gap-3">
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-7 h-7 bg-[var(--color-navy)] rounded flex items-center justify-center">
            <span className="text-white font-[var(--font-display)] text-sm font-[400] leading-none">M</span>
          </div>
          <span className="font-[var(--font-display)] text-lg font-[400] text-[var(--color-ink)]">Marketo</span>
        </div>
        <span className="w-px h-5 bg-[var(--color-border)]" aria-hidden="true" />
        <span className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] tracking-widest uppercase">
          Logistics Partner Portal
        </span>
      </div>
    </header>
  )
}

export function PublicFooter() {
  return (
    <footer className="bg-[var(--color-ink)] text-white mt-auto">
      <div className="max-w-screen-xl mx-auto px-4 md:px-6 py-10">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 bg-[var(--color-amber)] rounded flex items-center justify-center">
            <span className="text-white font-[var(--font-display)] text-sm font-[400]">M</span>
          </div>
          <span className="font-[var(--font-display)] text-lg font-[400]">Marketo</span>
        </div>
        <p className="text-xs text-white/50 leading-relaxed max-w-md">
          The Logistics Partner Portal is the workspace for approved Maketo logistics providers.
          Rider access is available only in the Maketo Rider App.
        </p>
        <div className="border-t border-white/10 mt-8 pt-6">
          <p className="text-xs text-white/30 font-[var(--font-mono)]">&copy; 2026 Marketo Inc. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}

export default function AuthLayout({
  title, subtitle, children, footnote,
}: {
  title: string
  subtitle?: ReactNode
  children: ReactNode
  footnote?: ReactNode
}) {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-ground)]">
      <a
        href="#logistics-auth-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-[var(--color-navy)] focus:text-white focus:text-sm focus:font-[500] focus:rounded focus:shadow-lg"
      >
        Skip to main content
      </a>

      <PublicHeader />

      <main id="logistics-auth-content" className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        {/* Brand mark, matching the Marketplace auth pages. */}
        <div className="mb-8 flex flex-col items-center gap-2">
          <div className="w-11 h-11 bg-[var(--color-navy)] rounded-sm flex items-center justify-center shadow-[0_2px_12px_rgba(26,53,80,0.25)]">
            <span className="font-[var(--font-display)] text-2xl text-white font-[400] leading-none">M</span>
          </div>
          <span className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] tracking-[0.22em] uppercase">Marketo</span>
          <span className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-disabled)] tracking-[0.18em] uppercase">Logistics Partner Portal</span>
        </div>

        <div className="w-full max-w-md bg-white border border-[var(--color-border)] rounded-sm shadow-[0_4px_32px_rgba(28,27,24,0.08)]">
          <div className="px-6 sm:px-8 pt-7 pb-6 border-b border-[var(--color-border)]">
            <h1 className="font-[var(--font-display)] text-2xl font-[400] text-[var(--color-ink)] leading-snug">{title}</h1>
            {subtitle && <div className="text-sm text-[var(--color-ink-muted)] mt-1.5 leading-relaxed">{subtitle}</div>}
          </div>
          <div className="px-6 sm:px-8 py-7 space-y-5">{children}</div>
        </div>

        {footnote && <div className="mt-5 text-center text-sm text-[var(--color-ink-muted)] max-w-md">{footnote}</div>}
      </main>

      <PublicFooter />
    </div>
  )
}
