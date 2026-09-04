import { Link } from "react-router"
import AuthLayout from "./AuthLayout"

export default function RiderAppOnlyPage() {
  return <AuthLayout title="Rider registration is app-only" subtitle="Apply and sign in through the Marketo Rider App.">
    <p className="text-sm leading-relaxed text-[var(--color-ink-muted)]">The Marketplace website does not accept Rider applications. The Rider App lets you select an approved Logistics Provider and sends your application to that provider for review.</p>
    <Link to="/register" className="block w-full rounded-sm bg-[var(--color-navy)] py-2.5 text-center text-sm font-[500] text-white">Back to registration</Link>
  </AuthLayout>
}
