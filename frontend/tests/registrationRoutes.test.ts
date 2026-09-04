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
const userRegistration = readFileSync(new URL("../src/pages/auth/UserRegistrationPage.tsx", import.meta.url), "utf8")
const authLayout = readFileSync(new URL("../src/pages/auth/AuthLayout.tsx", import.meta.url), "utf8")
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

test("registration pages share the Maketo auth design system", () => {
  // One shared kit: layout, field, select, file upload, sections, password strength.
  for (const source of [userRegistration, logisticsRegistration]) {
    assert.match(source, /from "\.\/AuthLayout"/)
    assert.match(source, /<FormSection/)
    assert.match(source, /<FieldRow/)
    assert.match(source, /<FileField/)
    assert.match(source, /<PasswordStrength/)
    // Long forms get a wider card, still inside the same branded layout.
    assert.match(source, /width="wide"/)
  }
  assert.match(authLayout, /max-w-3xl/)
  assert.match(authLayout, /export function FormSection/)
  assert.match(authLayout, /export function Select/)
  assert.match(authLayout, /export function FileField/)

  // Every backend-required registration field is still collected.
  for (const field of ["first_name", "last_name", "sex", "birthdate", "email", "phone",
    "address_line1", "region_code", "city_code", "barangay_code", "postal_code",
    "password", "password_confirmation", "company_name"]) {
    assert.match(logisticsRegistration, new RegExp(field))
  }
  for (const state of ["firstName", "lastName", "sex", "birthdate", "email", "phoneLocal",
    "street", "regionCode", "cityCode", "barangayCode", "postalCode", "idDocument",
    "password", "confirm"]) {
    assert.match(userRegistration, new RegExp(state))
  }

  // Logistics registration never instructs the applicant to become a Buyer first.
  assert.doesNotMatch(logisticsRegistration, /(create|register).{0,24}buyer|buyer account first|buyer registration/i)
  assert.match(logisticsRegistration, /does not require a Marketplace buyer account/i)
})

test("registration selector keeps User and Logistics only, with an explicit portal sign-in", () => {
  assert.doesNotMatch(selector, /label: "Seller"/)
  assert.doesNotMatch(selector, /label: "Rider"/)
  assert.match(selector, /logisticsLoginUrl\(\)/)
  assert.match(selector, /Become a Seller/)
  assert.match(selector, /Rider App/)
})
