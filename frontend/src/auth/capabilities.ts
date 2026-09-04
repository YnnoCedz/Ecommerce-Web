import type { AuthUser, UserCapabilities } from "../api/auth"

/**
 * Phase 2.6 - the single place the frontend answers "what may this identity do?".
 *
 * These helpers consume the capability summary the backend derives. They drive
 * menus, routes and UX only; Laravel middleware remains the authority for every
 * API call. Nothing here recalculates a business rule independently.
 */

const NO_CAPABILITIES: UserCapabilities = {
  buyer: false,
  seller: false,
  rider: false,
  logistics: false,
  admin: false,
}

/**
 * Read the backend summary. Falls back to the legacy flags only so that a client
 * running against an older API build degrades instead of locking everyone out.
 */
export function capabilitiesOf(
  user: AuthUser | null | undefined,
): UserCapabilities {
  if (!user) return NO_CAPABILITIES
  if (user.capabilities) return user.capabilities

  const isAdmin = user.role === "admin"
  const eligible = user.status === "active"

  return {
    buyer: eligible && !isAdmin,
    seller: eligible && Boolean(user.seller_approved),
    rider: eligible && Boolean(user.courier_approved),
    logistics: eligible && Boolean(user.logistics_access),
    admin: isAdmin,
  }
}

export function canShopMarketplace(user: AuthUser | null | undefined): boolean {
  return capabilitiesOf(user).buyer
}

export function canAccessSellerCenter(
  user: AuthUser | null | undefined,
): boolean {
  return capabilitiesOf(user).seller
}

export function canAccessRider(user: AuthUser | null | undefined): boolean {
  return capabilitiesOf(user).rider
}

export function canAccessLogistics(user: AuthUser | null | undefined): boolean {
  return capabilitiesOf(user).logistics
}

export function isAdmin(user: AuthUser | null | undefined): boolean {
  return capabilitiesOf(user).admin
}

/**
 * Where a seller-shaped identity belongs, used to keep Seller Center and the
 * onboarding flow from bouncing a user back and forth.
 *
 * `seller_status` distinguishes "never applied" from "applied" from
 * "was approved and is now suspended" - the last of which must land on a
 * terminal state page rather than back on the onboarding form.
 */
export type SellerAccessState =
  | "approved"
  | "under_review"
  | "needs_action"
  | "suspended"
  | "none"

export function sellerAccessState(
  user: AuthUser | null | undefined,
): SellerAccessState {
  if (!user) return "none"
  if (canAccessSellerCenter(user)) return "approved"

  switch (user.seller_status) {
    case "approved":
      // The profile is approved but the capability is not granted, which means
      // the account itself is not eligible right now.
      return "suspended"
    case "suspended":
    case "inactive":
      return "suspended"
    case "pending":
    case "reviewing":
    case "flagged":
      return "under_review"
    case "rejected":
    case "needs_revision":
      return "needs_action"
    default:
      return "none"
  }
}

/** Kept for callers that predate the capability summary. */
export function isMarketplaceShopper(
  user: AuthUser | null | undefined,
): boolean {
  return canShopMarketplace(user)
}

/** @deprecated Use canAccessSellerCenter. */
export function hasSellerAccess(user: AuthUser | null | undefined): boolean {
  return canAccessSellerCenter(user)
}

/** @deprecated Use canAccessRider. */
export function hasCourierCapability(
  user: AuthUser | null | undefined,
): boolean {
  return canAccessRider(user)
}
