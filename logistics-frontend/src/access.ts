import type { AuthUser } from "./api"

/**
 * Where a signed-in identity belongs after authenticating at the portal.
 *
 * The portal is the single logistics door, so the system decides this rather
 * than asking the user whether they are approved: with the capability they go
 * to the workspace, without it they go to the page that shows where their
 * application stands and how to apply.
 */
export function logisticsDestination(user: AuthUser | null): "/login" | "/application-status" | "/dashboard" {
  if (!user) return "/login"
  return user.capabilities.logistics ? "/dashboard" : "/application-status"
}
