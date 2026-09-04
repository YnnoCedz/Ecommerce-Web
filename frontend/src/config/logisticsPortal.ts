/**
 * Dedicated Logistics Partner Portal origin.
 *
 * Logistics staff never sign in through the Marketplace login page: the portal
 * is a separate frontend (logistics-frontend) with its own /login,
 * /access-denied and /dashboard routes. Riders have no web login at all
 * (Flutter Rider app only) and Sellers keep using the Marketplace login.
 *
 * Configure with VITE_LOGISTICS_FRONTEND_URL. Production deployments must set
 * it to the public Logistics portal origin; nothing here hardcodes a
 * production hostname.
 */
const configuredLogisticsFrontendUrl = import.meta.env.VITE_LOGISTICS_FRONTEND_URL?.trim().replace(/\/+$/, "")

// logistics-frontend's Vite dev server listens on 8450 (see logistics-frontend/package.json).
const LOCAL_LOGISTICS_FRONTEND_URL = "http://localhost:8450"

function deriveLogisticsFrontendUrl(): string {
  if (typeof window === "undefined") return LOCAL_LOGISTICS_FRONTEND_URL

  const { protocol, hostname } = window.location
  const apexHostname = hostname.replace(/^www\./i, "")

  return `${protocol}//logistics.${apexHostname}`
}

export const LOGISTICS_FRONTEND_URL: string =
  configuredLogisticsFrontendUrl ||
  (import.meta.env.DEV ? LOCAL_LOGISTICS_FRONTEND_URL : deriveLogisticsFrontendUrl())

/** Absolute URL of the Logistics Partner Portal sign-in page. */
export function logisticsLoginUrl(): string {
  return `${LOGISTICS_FRONTEND_URL}/login`
}
