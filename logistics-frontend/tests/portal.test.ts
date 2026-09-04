import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8")
const app = read("../src/App.tsx")
const api = read("../src/api.ts")
const shell = read("../src/components/AppShell.tsx")
const pages = read("../src/pages/PortalPages.tsx")

test("all requested Logistics workspace routes are real and sidebar-linked", () => {
  const routes = [
    "/dashboard", "/operations/pickups", "/operations/incoming", "/operations/sorting",
    "/operations/assignments", "/operations/shipments", "/riders", "/hubs", "/messages",
    "/reports", "/provider", "/staff", "/settings",
  ]
  for (const route of routes) {
    assert.ok(app.includes(`path="${route}"`), `missing route ${route}`)
    assert.ok(shell.includes(`path: "${route}"`), `missing sidebar item ${route}`)
  }
  assert.match(app, /path="\/operations\/shipments\/:id"/)
  assert.match(app, /path="\/riders\/:id"/)
  assert.match(app, /path="\/hubs\/:id"/)
})

test("authenticated workspace requires Logistics capability and authoritative context", () => {
  assert.match(app, /!user\.capabilities\.logistics \? <Navigate to="\/access-denied" replace \/>/)
  assert.match(app, /void context\(\)/)
  assert.match(app, /reason instanceof ApiError && reason\.status === 403/)
  assert.match(api, /authenticated && response\.status === 401/)
  assert.match(api, /window\.location\.assign\("\/login"\)/)
})

test("Maketo logo is clickable, environment-driven, and mobile navigation is accessible", () => {
  assert.match(shell, /href=\{MARKETPLACE_URL\}/)
  assert.match(shell, /aria-label="Return to Marketo Marketplace"/)
  assert.match(shell, /aria-label="Open navigation"/)
  assert.match(shell, /aria-label="Close navigation"/)
  assert.match(shell, /role="dialog"/)
  assert.match(shell, /lg:hidden/)
})

test("real backend integrations use only existing provider-scoped Logistics endpoints", () => {
  for (const endpoint of [
    "/logistics/context", "/logistics/hubs", "/logistics/shipments", "/logistics/riders",
    "/logistics/rider-applications", "/logistics/rider-documents",
  ]) assert.ok(api.includes(endpoint), `missing integration ${endpoint}`)
  assert.match(api, /check-in/)
  assert.match(api, /courier_id/)
  assert.doesNotMatch(api, /logistics\/pickups|logistics\/sorting|logistics\/messages|logistics\/reports/)
})

test("dashboard and unsupported modules never fabricate operational data", () => {
  assert.match(pages, /Live metrics are not available yet/)
  assert.match(pages, /No placeholder totals are shown/)
  assert.match(pages, /Operational integration pending/)
  assert.match(pages, /No fake conversations/)
  assert.match(pages, /No charts, totals, Excel, or PDF actions are fabricated/)
})

test("Rider approval remains provider-owned, hub-scoped, private, and app-only", () => {
  assert.match(pages, /Approve and affiliate/)
  assert.match(pages, /primary-hub/)
  assert.match(api, /primary_hub_id: primaryHubId/)
  assert.match(pages, /viewRiderDocument/)
  assert.match(pages, /temporary_url/)
  assert.match(pages, /Rider registration remains app-only/)
  assert.doesNotMatch(pages, /Register Rider|Rider registration form/)
})

test("first-mile, assignment, shipment, POD, and empty-state boundaries are explicit", () => {
  assert.match(pages, /does not reuse shipments\.courier_id or the last-mile picked-up state/)
  assert.match(pages, /CourierAssignmentService remains the sole writer of shipments\.courier_id/)
  assert.match(pages, /proof_of_delivery/)
  for (const emptyState of [
    "No incoming parcels", "No deliveries awaiting assignment", "No shipments found",
    "No pending Rider applications", "No active Riders", "No hubs configured",
  ]) assert.ok(pages.includes(emptyState), `missing empty state ${emptyState}`)
})

test("Rider tab choice survives refresh through the URL", () => {
  assert.match(pages, /useSearchParams\(\)/)
  assert.match(pages, /params\.get\("tab"\)/)
  assert.match(pages, /setParams\(\{ tab: value \}\)/)
})
