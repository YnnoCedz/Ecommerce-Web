import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const router = readFileSync(new URL("../src/router.tsx", import.meta.url), "utf8")
const selector = readFileSync(new URL("../src/pages/auth/RegisterSelectPage.tsx", import.meta.url), "utf8")
const login = readFileSync(new URL("../src/pages/auth/LoginPage.tsx", import.meta.url), "utf8")
const courierRoute = readFileSync(new URL("../src/pages/auth/RiderAppOnlyPage.tsx", import.meta.url), "utf8")

test("registration routes expose User and Logistics but no Rider web registration", () => {
  assert.match(router, /path: "user", Component: UserRegistrationPage/)
  assert.match(router, /path: "logistics", Component: LogisticsRegistrationPage/)
  assert.doesNotMatch(router, /path: "rider"/)
  assert.match(selector, /label: "User"/)
  assert.match(selector, /label: "Logistics"/)
  assert.doesNotMatch(selector, /label: "Rider"/)
})

test("legacy registration and courier web routes remain safe", () => {
  assert.match(router, /path: "register"/)
  assert.match(router, /to="\/register\/user"/)
  assert.match(router, /path: "courier\/apply", Component: RiderAppOnlyPage/)
  assert.match(courierRoute, /Rider App/)
  assert.doesNotMatch(courierRoute, /type="file"/)
})

test("marketplace login has explicit non-Buyer denial and capability-safe Logistics continuation", () => {
  assert.match(login, /"\/marketplace-unavailable"/)
  assert.match(login, /safeReturn === "\/register\/logistics"/)
  assert.match(router, /path: "\/marketplace-unavailable"/)
})
