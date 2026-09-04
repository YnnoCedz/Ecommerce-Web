import assert from "node:assert/strict";
import test from "node:test";
import {
  canAccessLogistics,
  canAccessRider,
  canAccessSellerCenter,
  canShopMarketplace,
  capabilitiesOf,
  isAdmin,
  sellerAccessState,
} from "../src/auth/capabilities.ts";
import type { AuthUser, UserCapabilities } from "../src/api/auth.ts";

function user(overrides: Partial<AuthUser> = {}): AuthUser {
  const capabilities: UserCapabilities = {
    buyer: true,
    seller: false,
    rider: false,
    logistics: false,
    admin: false,
    ...(overrides.capabilities ?? {}),
  };

  return {
    id: 1,
    name: "Ana Reyes",
    first_name: "Ana",
    middle_name: null,
    last_name: "Reyes",
    sex: "female",
    birthdate: "1996-04-12",
    age: 29,
    display_name: "Ana Reyes",
    avatar_url: null,
    email: "ana@maketo.local",
    mobile: "+639171234567",
    phone: "+639171234567",
    role: "buyer",
    status: "active",
    registration_status: "approved",
    marketplace_status: "approved",
    seller_status: null,
    seller_approved: false,
    courier_approved: false,
    logistics_access: false,
    logistics_staff_type: null,
    courier: null,
    location_label: null,
    email_verified_at: "2026-01-01T00:00:00Z",
    last_active_at: null,
    two_factor_enabled: false,
    two_factor_method: null,
    joined_at: null,
    ...overrides,
    capabilities,
  };
}

test("capabilities come from the backend summary, not from users.role", () => {
  // A legacy role='seller' identity with no approved profile has no seller
  // capability; a role='buyer' identity with an approved profile does.
  const legacyRoleOnly = user({ role: "seller" });
  assert.equal(canAccessSellerCenter(legacyRoleOnly), false);

  const approvedSeller = user({
    role: "buyer",
    capabilities: { seller: true } as UserCapabilities,
  });
  assert.equal(canAccessSellerCenter(approvedSeller), true);
});

test("one identity can hold buyer, seller and rider at once", () => {
  const multi = user({
    capabilities: { buyer: true, seller: true, rider: true } as UserCapabilities,
  });

  assert.equal(canShopMarketplace(multi), true);
  assert.equal(canAccessSellerCenter(multi), true);
  assert.equal(canAccessRider(multi), true);
  assert.equal(canAccessLogistics(multi), false);
  assert.equal(isAdmin(multi), false);
});

test("rider and logistics capabilities remain independent of marketplace state", () => {
  const riderWithPendingBuyer = user({
    marketplace_status: "pending",
    registration_status: "pending_review",
    capabilities: { buyer: false, rider: true } as UserCapabilities,
  });
  assert.equal(canShopMarketplace(riderWithPendingBuyer), false);
  assert.equal(canAccessRider(riderWithPendingBuyer), true);

  const logisticsWithRejectedBuyer = user({
    marketplace_status: "rejected",
    registration_status: "rejected",
    capabilities: { buyer: false, logistics: true } as UserCapabilities,
  });
  assert.equal(canShopMarketplace(logisticsWithRejectedBuyer), false);
  assert.equal(canAccessLogistics(logisticsWithRejectedBuyer), true);
});

test("admin is platform authority and not a marketplace capability", () => {
  const admin = user({
    role: "admin",
    capabilities: { buyer: false, admin: true } as UserCapabilities,
  });

  assert.equal(isAdmin(admin), true);
  assert.equal(canShopMarketplace(admin), false);
  assert.equal(canAccessSellerCenter(admin), false);
});

test("a null user has no capabilities", () => {
  assert.deepEqual(capabilitiesOf(null), {
    buyer: false,
    seller: false,
    rider: false,
    logistics: false,
    admin: false,
  });
});

test("seller access state separates suspended from never-applied", () => {
  // Never applied -> onboarding is the right destination.
  assert.equal(sellerAccessState(user()), "none");

  // Under review -> status page.
  assert.equal(
    sellerAccessState(user({ seller_status: "pending" })),
    "under_review",
  );
  assert.equal(
    sellerAccessState(user({ seller_status: "reviewing" })),
    "under_review",
  );

  // Rejected / needs revision -> the applicant can act.
  assert.equal(
    sellerAccessState(user({ seller_status: "rejected" })),
    "needs_action",
  );

  // Previously approved, now suspended. This is the case that used to bounce
  // between /seller-center and /seller-center/onboarding/status forever: the
  // guard sent them to onboarding, and onboarding saw an approved application
  // and sent them straight back.
  assert.equal(
    sellerAccessState(user({ seller_status: "suspended" })),
    "suspended",
  );

  // Approved profile but the account itself is not eligible - still terminal,
  // never a redirect back into Seller Center.
  assert.equal(
    sellerAccessState(
      user({ seller_status: "approved", capabilities: {} as UserCapabilities }),
    ),
    "suspended",
  );

  // Approved and eligible.
  assert.equal(
    sellerAccessState(
      user({
        seller_status: "approved",
        capabilities: { seller: true } as UserCapabilities,
      }),
    ),
    "approved",
  );
});

test("seller access state never returns a value that redirects back to Seller Center", () => {
  // Every non-approved state must resolve to a destination other than
  // /seller-center, which is what guarantees loop freedom.
  const destinations: Record<string, string> = {
    approved: "/seller-center",
    under_review: "/seller-center/onboarding/status",
    needs_action: "/seller-center/onboarding/status",
    suspended: "/403?reason=seller_suspended",
    none: "/seller-center/onboarding",
  };

  for (const [state, destination] of Object.entries(destinations)) {
    if (state === "approved") continue;
    assert.notEqual(
      destination,
      "/seller-center",
      `state ${state} must not route back to Seller Center`,
    );
  }
});

test("legacy flags are used only when the backend summary is absent", () => {
  const legacy = {
    ...user(),
    capabilities: undefined,
    seller_approved: true,
    courier_approved: true,
    logistics_access: false,
    status: "active",
    role: "buyer",
  } as unknown as AuthUser;

  const derived = capabilitiesOf(legacy);
  assert.equal(derived.buyer, true);
  assert.equal(derived.seller, true);
  assert.equal(derived.rider, true);
  assert.equal(derived.logistics, false);
  assert.equal(derived.admin, false);
});

test("a suspended account loses every marketplace capability in the fallback", () => {
  const suspended = {
    ...user(),
    capabilities: undefined,
    status: "suspended",
    seller_approved: true,
  } as unknown as AuthUser;

  const derived = capabilitiesOf(suspended);
  assert.equal(derived.buyer, false);
  assert.equal(derived.seller, false);
});
