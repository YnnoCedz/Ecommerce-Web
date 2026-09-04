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

const publicShell = readFileSync(new URL("../src/shells/PublicShell.tsx", import.meta.url), "utf8")
const logisticsRegistration = readFileSync(new URL("../src/pages/auth/LogisticsRegistrationPage.tsx", import.meta.url), "utf8")
const logisticsPortalConfig = readFileSync(new URL("../src/config/logisticsPortal.ts", import.meta.url), "utf8")

test("Logistics Sign In targets the dedicated Logistics frontend /login via environment configuration", () => {
  // The portal origin comes from VITE_LOGISTICS_FRONTEND_URL; no production hostname is hardcoded in React code.
  assert.match(logisticsPortalConfig, /import\.meta\.env\.VITE_LOGISTICS_FRONTEND_URL/)
  assert.match(logisticsPortalConfig, /\/login`/)
  for (const source of [publicShell, logisticsRegistration, logisticsPortalConfig]) {
    assert.doesNotMatch(source, /logistics\.marketohub\.online/)
  }

  // Header CTA: "Logistics partners: Sign in" is an external link to the Logistics portal, not the Marketplace login.
  assert.match(publicShell, /<a href=\{logisticsLoginUrl\(\)\}[^>]*>\s*Sign in\s*<\/a>/)
  assert.doesNotMatch(publicShell, /Logistics partners and riders/)

  // Registration page: the Logistics portal sign-in is separate from the shared-identity continuation flow.
  assert.match(logisticsRegistration, /href=\{logisticsLoginUrl\(\)\}/)
  assert.match(logisticsRegistration, /\/auth\/login\?returnTo=%2Fregister%2Flogistics/)
})

test("marketplace login has explicit non-Buyer denial and capability-safe Logistics continuation", () => {
  assert.match(login, /"\/marketplace-unavailable"/)
  assert.match(login, /safeReturn === "\/register\/logistics"/)
  assert.match(router, /path: "\/marketplace-unavailable"/)
})
