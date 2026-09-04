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
type Hub = { id: number; code: string; name: string; city_label?: string }

const API_BASE = (import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api").replace(/\/$/, "")
const TOKEN_KEY = "maketo.logistics.token"

export class ApiError extends Error {
  constructor(public status: number, public code?: string, message = "Request failed") { super(message) }
}

export const getToken = () => sessionStorage.getItem(TOKEN_KEY)
export const storeToken = (token: string) => sessionStorage.setItem(TOKEN_KEY, token)
export const clearToken = () => sessionStorage.removeItem(TOKEN_KEY)

async function request<T>(path: string, init: RequestInit = {}, authenticated = false): Promise<T> {
  const headers = new Headers(init.headers)
  headers.set("Accept", "application/json")
  if (init.body) headers.set("Content-Type", "application/json")
  if (authenticated && getToken()) headers.set("Authorization", `Bearer ${getToken()}`)
  const response = await fetch(`${API_BASE}${path}`, { ...init, headers })
  const payload = await response.json().catch(() => ({})) as { message?: string; code?: string }
  if (!response.ok) throw new ApiError(response.status, payload.code, payload.message)
  return payload as T
}

export const login = (email: string, password: string) => request<AuthResponse>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) })
export const verifyTwoFactor = (challengeId: number, challengeToken: string, code: string) => request<AuthResponse>("/auth/2fa/verify", { method: "POST", body: JSON.stringify({ challenge_id: challengeId, challenge_token: challengeToken, code }) })
export const me = () => request<{ user: AuthUser }>("/auth/me", {}, true)
export const context = () => request<{ data: LogisticsContext }>("/logistics/context", {}, true)
export const logout = () => request<{ message: string }>("/auth/logout", { method: "POST" }, true)
