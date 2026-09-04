import type { ReactNode } from "react"

/**
 * Maketo-branded shell for the Logistics Partner Portal.
 *
 * Mirrors the Marketplace auth surface (brand mark, single centred card, dark
 * footer) so both products read as one Maketo system. It deliberately carries
 * none of the Marketplace commerce navigation, which is irrelevant here.
 */

export function PublicHeader() {
  return (
    <header className="site-header">
      <div className="inner">
        <div className="brand-lockup">
          <span className="brand-tile" aria-hidden="true">M</span>
          <span className="brand-word">Marketo</span>
        </div>
        <span className="brand-divider" aria-hidden="true" />
        <span className="product-label">Logistics Partner Portal</span>
      </div>
    </header>
  )
}

export function PublicFooter() {
  return (
    <footer className="site-footer">
      <div className="inner">
        <div className="lockup">
          <span className="tile" aria-hidden="true">M</span>
          <span>Marketo</span>
        </div>
        <p>
          The Logistics Partner Portal is the workspace for approved Maketo logistics
          providers. Rider access is available only in the Maketo Rider App.
        </p>
        <div className="bar">
          <p>&copy; 2026 Marketo Inc. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}

export function Alert({ children, tone = "error" }: { children: ReactNode; tone?: "error" | "info" }) {
  return (
    <p className={tone === "info" ? "alert info" : "alert"} role="alert">
      {children}
    </p>
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
    <div className="shell">
      <PublicHeader />
      <main className="main">
        <div className="brand-mark">
          <span className="tile" aria-hidden="true">M</span>
          <span className="word">Marketo</span>
          <span className="sub">Logistics Partner Portal</span>
        </div>

        <section className="card">
          <header>
            <h1>{title}</h1>
            {subtitle && <p>{subtitle}</p>}
          </header>
          <div className="body">{children}</div>
        </section>

        {footnote && <div className="card-footnote">{footnote}</div>}
      </main>
      <PublicFooter />
    </div>
  )
}
