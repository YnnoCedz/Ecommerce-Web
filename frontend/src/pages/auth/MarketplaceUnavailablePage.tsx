import { Link } from "react-router"
import { useAuth } from "../../auth/AuthContext"

export default function MarketplaceUnavailablePage() {
  const { user, logout } = useAuth()
  const status = user?.marketplace_status
  const title = status === "pending" ? "Marketplace application under review" : status === "rejected" ? "Marketplace application not approved" : "Marketplace access unavailable"
  const body = status === "pending" ? "Your Marketo identity is verified. An administrator is reviewing your Marketplace application." : status === "rejected" ? "Your Marketplace application was not approved. Your other approved Marketo capabilities remain available." : "This Marketo identity does not have approved Buyer access."
  return <main className="min-h-screen bg-[var(--color-surface)] px-4 py-16"><section className="mx-auto max-w-lg rounded-sm border border-[var(--color-border)] bg-white p-8"><h1 className="text-xl font-[600] text-[var(--color-ink)]">{title}</h1><p className="mt-3 text-sm leading-relaxed text-[var(--color-ink-muted)]">{body}</p><div className="mt-6 flex gap-3"><Link to="/" className="rounded-sm border border-[var(--color-border)] px-4 py-2 text-sm">Browse public catalog</Link><button onClick={() => void logout()} className="rounded-sm bg-[var(--color-navy)] px-4 py-2 text-sm text-white">Sign out</button></div></section></main>
}
