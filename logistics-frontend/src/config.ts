/**
 * Marketplace origin used for the few shared-identity surfaces the Logistics
 * Portal links out to: password reset and Logistics provider registration.
 *
 * Configure with VITE_MARKETPLACE_URL. Nothing here hardcodes a production
 * hostname; when the variable is unset in a production build the origin is
 * derived by dropping the `logistics.` subdomain.
 */
const configuredMarketplaceUrl = import.meta.env.VITE_MARKETPLACE_URL?.trim().replace(/\/+$/, "")

// The Marketplace Vite dev server listens on 8443 (frontend/vite.config.ts).
const LOCAL_MARKETPLACE_URL = "http://localhost:8443"

function deriveMarketplaceUrl(): string {
  if (typeof window === "undefined") return LOCAL_MARKETPLACE_URL

  const { protocol, hostname } = window.location

  return `${protocol}//${hostname.replace(/^logistics\./i, "")}`
}

export const MARKETPLACE_URL: string =
  configuredMarketplaceUrl || (import.meta.env.DEV ? LOCAL_MARKETPLACE_URL : deriveMarketplaceUrl())

/** Shared Marketo identity password reset (Marketplace-owned). */
export const forgotPasswordUrl = (): string => `${MARKETPLACE_URL}/auth/forgot-password`

/** Logistics provider application (Marketplace public registration surface). */
export const logisticsRegistrationUrl = (): string => `${MARKETPLACE_URL}/register/logistics`
