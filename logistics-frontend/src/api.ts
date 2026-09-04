export type Capabilities = { buyer: boolean; seller: boolean; rider: boolean; logistics: boolean; admin: boolean }
export type AuthUser = { id: number; display_name: string; email: string; capabilities: Capabilities; two_factor_enabled: boolean }
type AuthResponse = {
  message: string; token?: string; user?: AuthUser; requires_two_factor?: boolean;
  two_factor_challenge_id?: number; two_factor_challenge_token?: string; code?: string;
}
export type LogisticsContext = {
  staff: { id: number; name: string; type: string; status: string; primary_hub: Hub | null };
  provider: { id: number; code: string; company_name: string; status: string };
  authorized_hubs: Hub[];
}
export type HubSummary = { id: number; code: string; name: string; city_code?: string; city_label?: string }
type Hub = HubSummary

export type LogisticsHub = HubSummary & {
  active: boolean
  address: {
    line1: string; line2?: string | null; region_label?: string | null; province_label?: string | null
    city_label?: string | null; barangay_label?: string | null; postal_code?: string | null
  }
  service_areas: { municipality_code: string; municipality_label: string; priority: number; active: boolean }[]
}

export type PageMeta = { current_page: number; last_page: number; per_page: number; total: number }

export type LogisticsShipment = {
  id: number; tracking_number: string; status: string; logistics_provider_id: number
  provider: { id: number; code: string; company_name: string } | null
  current_hub: HubSummary | null; hub_received_at: string | null
  courier: { id: number; name: string } | null; order_number: string | null
  proof_of_delivery?: { exists: boolean }
  tracking_events?: { status: string; location: string | null; note: string | null; occurred_at: string | null }[]
}

export type RiderAffiliation = {
  id: number; courier_id: number; courier_name: string | null; logistics_provider_id: number
  primary_hub: HubSummary | null; status: string; assigned_at: string | null; ended_at: string | null
}

export type RiderApplication = {
  id: number; status: string
  provider: { id: number; code: string; company_name: string } | null
  applicant: { id: number; name: string; email: string } | null
  vehicle: { type: string; make: string; model: string; year: number; plate_number: string; color: string }
  primary_hub: HubSummary | null; submitted_at: string | null; reviewed_at: string | null
  rejection_reason: string | null
  documents: { id: number; document_type: string; original_filename: string; status: string }[]
}

export type LogisticsApplication = {
  id: number
  status: "pending" | "approved" | "rejected" | string
  company_name: string
  submitted_at: string | null
  reviewed_at: string | null
  rejection_reason: string | null
  documents: { id: number; document_type: string; original_filename: string; status: string }[]
}

export type LocationOption = { code: string; name: string; postal_code?: string }

export type ApplicationPayload = {
  company_name: string
  legal_name?: string
  address_line1: string
  address_line2?: string
  region_code: string
  province_code?: string
  city_code: string
  barangay_code: string
  postal_code: string
  applicant_id: File
  business_permit: File
}

// VITE_API_URL is the deployment variable (Cloudflare Workers Builds sets the
// production value). VITE_API_BASE_URL is accepted for existing local .env files.
// The localhost fallback only covers a missing local .env; production builds set VITE_API_URL.
const API_BASE = (import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api").replace(/\/$/, "")
const TOKEN_KEY = "maketo.logistics.token"

export class ApiError extends Error {
  constructor(
    public status: number,
    public code?: string,
    message = "Request failed",
    public errors?: Record<string, string[]>,
  ) { super(message) }
}

export const getToken = () => sessionStorage.getItem(TOKEN_KEY)
export const storeToken = (token: string) => sessionStorage.setItem(TOKEN_KEY, token)
export const clearToken = () => sessionStorage.removeItem(TOKEN_KEY)

async function request<T>(path: string, init: RequestInit = {}, authenticated = false): Promise<T> {
  const headers = new Headers(init.headers)
  headers.set("Accept", "application/json")
  // FormData sets its own multipart boundary; only JSON bodies get an explicit type.
  if (init.body && !(init.body instanceof FormData)) headers.set("Content-Type", "application/json")
  if (authenticated && getToken()) headers.set("Authorization", `Bearer ${getToken()}`)
  const response = await fetch(`${API_BASE}${path}`, { ...init, headers })
  const payload = await response.json().catch(() => ({})) as { message?: string; code?: string; errors?: Record<string, string[]> }
  if (!response.ok) {
    if (authenticated && response.status === 401) {
      clearToken()
      if (typeof window !== "undefined" && window.location.pathname !== "/login") window.location.assign("/login")
    }
    throw new ApiError(response.status, payload.code, payload.message, payload.errors)
  }
  return payload as T
}

export const login = (email: string, password: string) => request<AuthResponse>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) })
export const verifyTwoFactor = (challengeId: number, challengeToken: string, code: string) => request<AuthResponse>("/auth/2fa/verify", { method: "POST", body: JSON.stringify({ challenge_id: challengeId, challenge_token: challengeToken, code }) })
export const me = () => request<{ user: AuthUser }>("/auth/me", {}, true)
export const context = () => request<{ data: LogisticsContext }>("/logistics/context", {}, true)
export const logout = () => request<{ message: string }>("/auth/logout", { method: "POST" }, true)

const queryString = (params: Record<string, string | number | undefined>) => {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => { if (value !== undefined && value !== "") query.set(key, String(value)) })
  const value = query.toString()
  return value ? `?${value}` : ""
}

export const fetchHubs = () => request<{ data: LogisticsHub[] }>("/logistics/hubs", {}, true)
export const fetchShipments = (params: { search?: string; status?: string; per_page?: number; page?: number } = {}) =>
  request<{ data: LogisticsShipment[]; meta: PageMeta }>(`/logistics/shipments${queryString(params)}`, {}, true)
export const fetchShipment = (id: number) => request<{ data: LogisticsShipment }>(`/logistics/shipments/${id}`, {}, true)
export const checkInShipment = (id: number, hubId: number) => request<{ message: string; data: LogisticsShipment }>(
  `/logistics/shipments/${id}/check-in`, { method: "POST", body: JSON.stringify({ hub_id: hubId }) }, true,
)
export const assignShipmentRider = (id: number, courierId: number) => request<{ message: string; data: LogisticsShipment }>(
  `/logistics/shipments/${id}/courier`, { method: "PATCH", body: JSON.stringify({ courier_id: courierId }) }, true,
)
export const fetchRiders = (page = 1) => request<{ data: RiderAffiliation[]; meta: PageMeta }>(
  `/logistics/riders${queryString({ page, per_page: 50 })}`, {}, true,
)
export const fetchRiderApplications = (params: { status?: string; search?: string; page?: number } = {}) =>
  request<{ data: RiderApplication[]; meta: PageMeta }>(`/logistics/rider-applications${queryString({ ...params, per_page: 20 })}`, {}, true)
export const fetchRiderApplication = (id: number) => request<{ data: RiderApplication }>(`/logistics/rider-applications/${id}`, {}, true)
export const approveRiderApplication = (id: number, primaryHubId: number) => request<{ message: string; data: RiderApplication }>(
  `/logistics/rider-applications/${id}/approve`, { method: "POST", body: JSON.stringify({ primary_hub_id: primaryHubId }) }, true,
)
export const rejectRiderApplication = (id: number, rejectionReason: string) => request<{ message: string; data: RiderApplication }>(
  `/logistics/rider-applications/${id}/reject`, { method: "POST", body: JSON.stringify({ rejection_reason: rejectionReason }) }, true,
)
export const viewRiderDocument = (id: number) => request<{ data: { temporary_url: string } }>(`/logistics/rider-documents/${id}/view`, {}, true)

// ── Logistics provider application (shared identity, portal-owned) ───────────

export const currentApplication = () =>
  request<{ data: LogisticsApplication | null }>("/logistics/application", {}, true)

export const submitApplication = (payload: ApplicationPayload) => {
  const body = new FormData()
  for (const [field, value] of Object.entries(payload)) {
    if (value !== undefined && value !== "") body.append(field, value as string | File)
  }

  return request<{ message: string; data: LogisticsApplication }>(
    "/logistics/applications", { method: "POST", body }, true,
  )
}

// ── Philippine address lookups (public endpoints, cached per path) ───────────

const locationRequests = new Map<string, Promise<LocationOption[]>>()

function loadLocations(path: string): Promise<LocationOption[]> {
  const existing = locationRequests.get(path)
  if (existing) return existing

  const pending = request<{ data: LocationOption[] }>(path)
    .then(response => response.data)
    .catch(reason => { locationRequests.delete(path); throw reason })
  locationRequests.set(path, pending)

  return pending
}

export const fetchRegions = () => loadLocations("/locations/regions")
export const fetchProvinces = (regionCode: string) => loadLocations(`/locations/regions/${encodeURIComponent(regionCode)}/provinces`)
export const fetchRegionCities = (regionCode: string) => loadLocations(`/locations/regions/${encodeURIComponent(regionCode)}/cities-municipalities`)
export const fetchProvinceCities = (provinceCode: string) => loadLocations(`/locations/provinces/${encodeURIComponent(provinceCode)}/cities-municipalities`)
export const fetchBarangays = (cityCode: string) => loadLocations(`/locations/cities-municipalities/${encodeURIComponent(cityCode)}/barangays`)
