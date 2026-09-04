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
