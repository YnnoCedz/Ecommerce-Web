import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { logisticsDestination } from "../src/access.ts"
import type { AuthUser } from "../src/api.ts"

function user(logistics: boolean): AuthUser {
  return {
    id: 1,
    display_name: "Lina Santos",
    email: "lina@example.test",
    two_factor_enabled: false,
    capabilities: { buyer: false, seller: false, rider: false, logistics, admin: false },
  }
}

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8")
const app = read("../src/App.tsx")
const authLayout = read("../src/components/AuthLayout.tsx")
const appShell = read("../src/components/AppShell.tsx")
const ui = read("../src/components/ui.tsx")
const styles = read("../src/styles.css")
const config = read("../src/config.ts")

test("only Logistics-capable identities bootstrap the dashboard", () => {
  assert.equal(logisticsDestination(user(true)), "/dashboard")
  assert.equal(logisticsDestination(user(false)), "/access-denied")
  assert.equal(logisticsDestination(null), "/login")
})

test("minimal client wires shared 2FA, context, and logout", () => {
  assert.match(app, /verifyTwoFactor/)
  assert.match(app, /context\(\)/)
  assert.match(app, /await logout\(\)/)
  assert.match(app, /path="\/access-denied"/)
})

test("public routes share the branded auth shell, authenticated routes the app shell", () => {
  // Login (which also renders the 2FA challenge), access-denied and the
  // session-restore state use AuthLayout; the dashboard uses AppShell.
  assert.equal(app.match(/<AuthLayout/g)?.length, 3)
  assert.match(app, /<AppShell user=\{user\} onSignOut=\{signOut\}>/)
  assert.match(authLayout, /PublicHeader/)
  assert.match(authLayout, /PublicFooter/)
  assert.match(authLayout, /Logistics Partner Portal/)

  // Maketo branding, but none of the Marketplace commerce navigation.
  for (const source of [app, authLayout, appShell]) {
    assert.doesNotMatch(source, /Cart|Wishlist|Seller Center|Categories|Wishlist/)
  }

  // Access denied never blames the credentials.
  assert.match(app, /does not currently have access to the Logistics Partner Portal/)
  assert.doesNotMatch(app, /Invalid password|Invalid email/)
})

test("the portal renders from the Marketplace design tokens", () => {
  // The token block is copied from frontend/src/index.css; spot-check the
  // brand, ground and status values plus the shared skeleton rule.
  for (const token of ["--color-navy: #1A3550", "--color-ground: #F8F7F3", "--color-amber: #B8782A",
    "--color-border: #DDD9CE", "--color-green: #2D6A4F", "--color-red: #8B2C2C",
    "--font-display: 'Fraunces'", "--font-body: 'Outfit'"]) {
    assert.ok(styles.includes(token), `missing design token: ${token}`)
  }
  assert.match(styles, /@import 'tailwindcss'/)
  assert.match(styles, /\.skeleton \{/)

  // Shared primitives exist so future Logistics pages inherit the same system.
  for (const primitive of ["export function Button", "export function Field", "export function Alert",
    "export function StatusBadge", "export function PageHeader", "export function Card",
    "export function EmptyState", "export function LoadingRows", "export function DataTable"]) {
    assert.ok(ui.includes(primitive), `missing UI primitive: ${primitive}`)
  }
})

test("the sidebar only links to routes that exist", () => {
  const navPaths = [...appShell.matchAll(/path: "([^"]+)"/g)].map(match => match[1])
  const routePaths = [...app.matchAll(/<Route path="([^"]+)"/g)].map(match => match[1])
  assert.ok(navPaths.length > 0)
  for (const path of navPaths) {
    assert.ok(routePaths.includes(path), `sidebar links to a route that does not exist: ${path}`)
  }
})

test("outbound Marketplace links stay environment-driven", () => {
  assert.match(config, /import\.meta\.env\.VITE_MARKETPLACE_URL/)
  assert.doesNotMatch(config, /marketohub\.online/)
  for (const source of [app, authLayout, appShell, ui]) {
    assert.doesNotMatch(source, /https?:\/\/(?!localhost)/)
  }
})
