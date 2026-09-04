import type { AuthUser } from "./api"

export function logisticsDestination(user: AuthUser | null): "/login" | "/access-denied" | "/dashboard" {
  if (!user) return "/login"
  return user.capabilities.logistics ? "/dashboard" : "/access-denied"
}
