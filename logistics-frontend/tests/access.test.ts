import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { logisticsDestination } from "../src/access.ts"
import type { AuthUser } from "../src/api.ts"

function user(logistics: boolean): AuthUser {
  return {
    id: 1,
    name: "Lina Santos",
    email: "lina@example.test",
    status: "active",
    capabilities: { buyer: false, seller: false, rider: false, logistics, admin: false },
  }
}

test("only Logistics-capable identities bootstrap the dashboard", () => {
  assert.equal(logisticsDestination(user(true)), "/dashboard")
  assert.equal(logisticsDestination(user(false)), "/access-denied")
  assert.equal(logisticsDestination(null), "/login")
})

test("minimal client wires shared 2FA, context, and logout", () => {
  const app = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8")
  assert.match(app, /verifyTwoFactor/)
  assert.match(app, /context\(\)/)
  assert.match(app, /await logout\(\)/)
  assert.match(app, /path="\/access-denied"/)
})

test("portal pages share the Maketo branded shell and never expose Marketplace commerce nav", () => {
  const app = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8")
  const layout = readFileSync(new URL("../src/components/AuthLayout.tsx", import.meta.url), "utf8")
  const config = readFileSync(new URL("../src/config.ts", import.meta.url), "utf8")

  // Login (which also renders the 2FA challenge), access-denied, the dashboard
  // and the session-restore state all render inside the same AuthLayout.
  assert.equal(app.match(/<AuthLayout/g)?.length, 4)
  assert.match(layout, /PublicHeader/)
  assert.match(layout, /site-footer/)
  assert.match(layout, /Logistics Partner Portal/)

  // Maketo branding, but no Marketplace commerce navigation.
  for (const source of [app, layout]) {
    assert.doesNotMatch(source, /Cart|Wishlist|Seller Center/)
  }

  // Access denied never blames the credentials.
  assert.match(app, /does not currently have Logistics access/)
  assert.doesNotMatch(app, /Invalid password/)

  // Outbound shared-identity links stay environment-driven.
  assert.match(config, /import\.meta\.env\.VITE_MARKETPLACE_URL/)
  assert.doesNotMatch(config, /marketohub\.online/)
  assert.doesNotMatch(app, /https?:\/\/(?!localhost)/)
})
