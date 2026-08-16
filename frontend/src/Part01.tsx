import { useState } from "react";
import { Tag, SectionHeader, Card } from "./shared";

const SECTIONS = [
  { id: "scope", label: "01 — Product Scope" },
  { id: "roles", label: "02 — User Roles" },
  { id: "features", label: "03 — Core Features" },
  { id: "capabilities", label: "04 — Web Capabilities" },
  { id: "boundaries", label: "05 — Product Boundaries" },
  { id: "tech", label: "06 — Technical Constraints" },
  { id: "principles", label: "07 — Design Principles" },
  { id: "assumptions", label: "08 — Assumptions" },
  { id: "risks", label: "09 — Risks" },
  { id: "questions", label: "10 — Open Questions" },
  { id: "screens", label: "11 — Screen Categories" },
];

function RoleCard({ role, color, capabilities }: { role: string; color: "navy" | "amber" | "green" | "violet"; capabilities: string[] }) {
  const accent: Record<string, string> = {
    navy: "border-l-[var(--color-navy)]",
    amber: "border-l-[var(--color-amber)]",
    green: "border-l-[var(--color-green)]",
    violet: "border-l-[var(--color-violet)]",
  };
  return (
    <div className={`bg-white border border-[var(--color-border)] border-l-4 ${accent[color]} rounded-sm p-5`}>
      <div className="mb-3"><Tag color={color}>{role}</Tag></div>
      <ul className="space-y-1.5">
        {capabilities.map((cap) => (
          <li key={cap} className="flex items-start gap-2 text-sm text-[var(--color-ink)]">
            <span className="text-[var(--color-ink-muted)] mt-0.5 shrink-0">·</span>{cap}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Risk({ level, title, description }: { level: "high" | "medium" | "low"; title: string; description: string }) {
  const badge = { high: "red", medium: "amber", low: "green" } as const;
  return (
    <div className="flex gap-4 py-3.5 border-b border-[var(--color-border)] last:border-0">
      <div className="shrink-0 pt-0.5"><Tag color={badge[level]}>{level.toUpperCase()}</Tag></div>
      <div>
        <p className="text-sm font-[600] text-[var(--color-ink)] mb-0.5">{title}</p>
        <p className="text-sm text-[var(--color-ink-muted)] leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

function Question({ num, question, rationale }: { num: string; question: string; rationale: string }) {
  return (
    <div className="flex gap-4 py-3.5 border-b border-[var(--color-border)] last:border-0">
      <span className="font-[var(--font-mono)] text-[11px] text-[var(--color-ink-muted)] shrink-0 pt-1 w-6">{num}</span>
      <div>
        <p className="text-sm font-[600] text-[var(--color-ink)] mb-0.5">{question}</p>
        <p className="text-sm text-[var(--color-ink-muted)] leading-relaxed">{rationale}</p>
      </div>
    </div>
  );
}

export default function Part01() {
  const [activeSection, setActiveSection] = useState("scope");

  const scrollTo = (id: string) => {
    setActiveSection(id);
    document.getElementById(`p1-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="flex">
      <aside className="hidden lg:block w-56 xl:w-64 shrink-0 sticky top-[88px] h-[calc(100vh-88px)] overflow-y-auto border-r border-[var(--color-border)] bg-[var(--color-surface)] py-6">
        <div className="px-5 mb-4">
          <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] tracking-widest uppercase">Sections</p>
        </div>
        <nav>
          {SECTIONS.map((s) => (
            <button key={s.id} onClick={() => scrollTo(s.id)}
              className={`w-full text-left px-5 py-2 text-xs font-[var(--font-mono)] transition-colors ${activeSection === s.id ? "text-[var(--color-navy)] bg-white border-r-2 border-[var(--color-navy)] font-[500]" : "text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:bg-white/60"}`}>
              {s.label}
            </button>
          ))}
        </nav>
      </aside>

      <main className="flex-1 min-w-0 px-6 md:px-10 xl:px-16 py-10 max-w-4xl">
        <div className="mb-14">
          <div className="mb-2"><Tag color="muted">FOUNDATION DOCUMENT</Tag></div>
          <h1 className="font-[var(--font-display)] text-5xl md:text-6xl font-[300] text-[var(--color-ink)] leading-[1.05] mb-4">
            Multi-Vendor<br /><em className="font-[300] italic text-[var(--color-navy)]">Ecommerce Platform</em>
          </h1>
          <p className="text-base text-[var(--color-ink-muted)] font-[300] max-w-xl leading-relaxed">
            This document establishes the product scope, role definitions, capability boundaries, technical constraints, and foundational design principles for an original enterprise-grade marketplace web platform.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Tag color="navy">Web Platform Only</Tag>
            <Tag color="green">3 User Roles</Tag>
            <Tag color="amber">Multi-Vendor</Tag>
            <Tag color="violet">Laravel · React</Tag>
          </div>
        </div>

        <section id="p1-scope" className="mb-14 scroll-mt-24">
          <SectionHeader num="01" title="Product Scope" />
          <p className="text-sm text-[var(--color-ink-muted)] mb-5 leading-relaxed">
            The platform is a web-native multi-vendor marketplace enabling independent sellers to list, manage, and sell products to buyers — coordinated through a centralized administrative layer.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
            {[
              { label: "Platform Type", value: "Multi-vendor marketplace" },
              { label: "Delivery Model", value: "Third-party courier integration" },
              { label: "Channel", value: "Web only (this platform)" },
              { label: "Seller Model", value: "Independent seller stores" },
              { label: "Product Model", value: "Physical goods (primary)" },
              { label: "Revenue Model", value: "Commission / listing fees" },
            ].map(({ label, value }) => (
              <Card key={label}>
                <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] tracking-widest uppercase mb-1">{label}</p>
                <p className="text-sm font-[500] text-[var(--color-ink)]">{value}</p>
              </Card>
            ))}
          </div>
          <Card className="bg-[#E0EAF4] border-[#B8CEDF]">
            <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-navy)] tracking-widest uppercase mb-2">Explicit Scope Restriction</p>
            <p className="text-sm text-[var(--color-navy)] leading-relaxed">
              This project covers the <strong>web platform only</strong>: buyer experience, seller experience, administrator experience, and the public marketplace. The courier/delivery application is a separate future mobile project and is explicitly out of scope. Courier data may appear within the web platform for contextual information (tracking, assignment) but no courier-facing UI is designed here.
            </p>
          </Card>
        </section>

        <section id="p1-roles" className="mb-14 scroll-mt-24">
          <SectionHeader num="02" title="User Roles" />
          <p className="text-sm text-[var(--color-ink-muted)] mb-5 leading-relaxed">Three primary web user roles. Each operates within a distinct sub-application with role-scoped permissions.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <RoleCard role="CUSTOMER / BUYER" color="navy" capabilities={["Browse & search products","Filter by category/price","View product detail pages","Manage cart & wishlist","Checkout with address selection","Track orders","Submit reviews","Manage notifications","Message sellers (within rules)","Report users"]} />
            <RoleCard role="SELLER" color="amber" capabilities={["Register & apply as seller","Select category/line of business","Create & manage store","Manage products & variants","Manage inventory & pricing","Process & manage orders","Run promotions","View analytics dashboard","Manage reviews","Message buyers (within rules)"]} />
            <RoleCard role="ADMINISTRATOR" color="violet" capabilities={["Manage all users","Review seller applications","Manage product catalog","Manage categories","Oversee orders","View delivery/courier data","Manage reports & moderation","View platform analytics","Configure platform settings","Manage platform content"]} />
          </div>
        </section>

        <section id="p1-features" className="mb-14 scroll-mt-24">
          <SectionHeader num="03" title="Core Features" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              { group: "Discovery", items: ["Product search with filters","Category browsing","Storefront pages","Product detail pages","Related products"] },
              { group: "Commerce", items: ["Shopping cart","Wishlist","Multi-seller checkout","Address management","Delivery option selection"] },
              { group: "Seller Tooling", items: ["Seller registration & onboarding","Store creation & management","Product & variant management","Inventory tracking","Promotion & discount management"] },
              { group: "Orders & Fulfillment", items: ["Order management (buyer + seller)","Order status tracking","Delivery status (contextual)","Return/dispute initiation"] },
              { group: "Trust & Safety", items: ["Product reviews & ratings","User reporting","Seller verification flow","Admin moderation queue"] },
              { group: "Platform Management", items: ["Category administration","Seller application review","User management","Platform-wide analytics","Settings & configuration"] },
            ].map(({ group, items }) => (
              <Card key={group}>
                <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] tracking-widest uppercase mb-3">{group}</p>
                <ul className="space-y-1">
                  {items.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-[var(--color-ink)]">
                      <span className="text-[var(--color-amber)] mt-0.5 shrink-0 font-[500]">·</span>{item}
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
        </section>

        <section id="p1-capabilities" className="mb-14 scroll-mt-24">
          <SectionHeader num="04" title="Major Web Capabilities" />
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b-2 border-[var(--color-border)]">
                  <th className="text-left font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] tracking-widest uppercase py-2 pr-4 w-48">Capability</th>
                  {["Buyer","Seller","Admin","Public"].map(h => <th key={h} className="text-center font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] tracking-widest uppercase py-2 px-3 w-20">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {[
                  ["Product browsing", true, false, false, true],
                  ["Product search & filter", true, false, false, true],
                  ["Storefront view", true, false, false, true],
                  ["Cart & wishlist", true, false, false, false],
                  ["Checkout", true, false, false, false],
                  ["Order tracking", true, true, true, false],
                  ["Account management", true, true, true, false],
                  ["Product management", false, true, true, false],
                  ["Inventory management", false, true, false, false],
                  ["Analytics dashboard", false, true, true, false],
                  ["Promotions management", false, true, true, false],
                  ["Seller application review", false, false, true, false],
                  ["User management", false, false, true, false],
                  ["Category management", false, false, true, false],
                  ["Platform settings", false, false, true, false],
                  ["Moderation queue", false, false, true, false],
                  ["Courier data (contextual)", true, true, true, false],
                ].map(([cap, ...flags]) => (
                  <tr key={cap as string} className="border-b border-[var(--color-border)] hover:bg-white/60 transition-colors">
                    <td className="py-2.5 pr-4 text-[var(--color-ink)]">{cap as string}</td>
                    {flags.map((has, i) => (
                      <td key={i} className="py-2.5 px-3 text-center">
                        {has ? <span className="inline-block w-4 h-4 bg-[var(--color-navy)] rounded-full mx-auto" /> : <span className="inline-block w-4 h-px bg-[var(--color-border)] mx-auto" />}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section id="p1-boundaries" className="mb-14 scroll-mt-24">
          <SectionHeader num="05" title="Product Boundaries" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-green)] tracking-widest uppercase mb-3 flex items-center gap-2"><span className="inline-block w-2 h-2 bg-[var(--color-green)] rounded-full" />In Scope</p>
              <ul className="space-y-2">{["Buyer web experience","Seller web dashboard & tools","Public marketplace & storefront pages","Admin web panel","Courier data displayed within web (read-only, contextual)","Multi-vendor checkout flow","Seller onboarding & category selection","Platform-configurable product categories"].map(item => <li key={item} className="flex items-start gap-2 text-sm text-[var(--color-ink)]"><span className="text-[var(--color-green)] mt-0.5 shrink-0">✓</span>{item}</li>)}</ul>
            </Card>
            <Card>
              <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-red)] tracking-widest uppercase mb-3 flex items-center gap-2"><span className="inline-block w-2 h-2 bg-[var(--color-red)] rounded-full" />Out of Scope</p>
              <ul className="space-y-2">{["Courier mobile application (separate future project)","Courier-facing dashboard or navigation","Courier onboarding flow","Courier earnings & payout interface","Courier delivery interface","Native mobile apps (iOS / Android)","Backend API implementation","Payment gateway configuration","Third-party courier service setup"].map(item => <li key={item} className="flex items-start gap-2 text-sm text-[var(--color-ink-muted)]"><span className="text-[var(--color-red)] mt-0.5 shrink-0">✕</span>{item}</li>)}</ul>
            </Card>
          </div>
        </section>

        <section id="p1-tech" className="mb-14 scroll-mt-24">
          <SectionHeader num="06" title="Technical Constraints" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              { layer: "Frontend Framework", value: "React + TypeScript + Vite", note: "Component-based SPA architecture" },
              { layer: "Styling", value: "CSS / Tailwind CSS v4", note: "Utility-first, design token-driven" },
              { layer: "Backend", value: "PHP — Laravel", note: "RESTful API; Eloquent ORM" },
              { layer: "Database", value: "MySQL", note: "Relational; normalized schema" },
              { layer: "Rendering", value: "Client-side rendered (CSR)", note: "Possible SSR later for SEO" },
              { layer: "API Contract", value: "REST (JSON)", note: "GraphQL not assumed" },
              { layer: "Authentication", value: "JWT or Laravel Sanctum", note: "Role-based access control required" },
              { layer: "File Storage", value: "Cloud storage (S3-compatible)", note: "Product images, assets" },
            ].map(({ layer, value, note }) => (
              <Card key={layer} className="flex gap-4">
                <div className="shrink-0 mt-0.5"><span className="inline-block w-1.5 h-1.5 bg-[var(--color-navy)] rounded-full mt-1" /></div>
                <div>
                  <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] tracking-widest uppercase mb-0.5">{layer}</p>
                  <p className="text-sm font-[500] text-[var(--color-ink)] mb-0.5">{value}</p>
                  <p className="text-xs text-[var(--color-ink-muted)]">{note}</p>
                </div>
              </Card>
            ))}
          </div>
        </section>

        <section id="p1-principles" className="mb-14 scroll-mt-24">
          <SectionHeader num="07" title="Design Principles" />
          <div className="space-y-3">
            {[
              { num: "P01", title: "Clarity over decoration", body: "Every visual element earns its place. Remove anything that does not aid comprehension, navigation, or trust." },
              { num: "P02", title: "Trust is earned through consistency", body: "Uniform spacing, predictable interaction patterns, and stable component behavior signal professionalism and reliability." },
              { num: "P03", title: "Commerce-first hierarchy", body: "Product images, pricing, and purchase actions are the primary visual priority. Supporting information is secondary." },
              { num: "P04", title: "Roles are distinct, not separate", body: "Buyer, seller, and admin experiences share a coherent visual language but maintain clearly differentiated IA and navigation." },
              { num: "P05", title: "Accessibility as a baseline", body: "All text meets WCAG AA contrast ratios. Interactive controls signal state without relying on color alone. Keyboard navigation is complete." },
              { num: "P06", title: "Responsive at every breakpoint", body: "The platform must work equally well at 375px and 1440px. Mobile-first layout decisions; no critical UI clipped on small screens." },
              { num: "P07", title: "Categories are data, not fixtures", body: "The seller category selection and all category-driven UI must be configurable from the admin layer. No hardcoded category names in the frontend." },
              { num: "P08", title: "Restraint in motion", body: "Transitions are functional: confirming state changes, guiding attention, communicating load. No decorative animation." },
            ].map(({ num, title, body }) => (
              <div key={num} className="flex gap-5 py-4 border-b border-[var(--color-border)] last:border-0">
                <span className="font-[var(--font-mono)] text-[11px] text-[var(--color-amber)] shrink-0 w-8 pt-0.5">{num}</span>
                <div>
                  <p className="text-sm font-[600] text-[var(--color-ink)] mb-1">{title}</p>
                  <p className="text-sm text-[var(--color-ink-muted)] leading-relaxed">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section id="p1-assumptions" className="mb-14 scroll-mt-24">
          <SectionHeader num="08" title="Assumptions" />
          <div className="space-y-0">
            {[
              { id: "A01", text: "Categories are fully configurable by administrators. The frontend never assumes a fixed category list." },
              { id: "A02", text: "Sellers apply once and are approved before their store becomes publicly visible." },
              { id: "A03", text: "A single checkout can contain items from multiple sellers and will generate multiple sub-orders." },
              { id: "A04", text: "Courier assignment is handled by the backend; the web platform only displays status." },
              { id: "A05", text: "Authentication is token-based (JWT or Sanctum). Role-based access control enforced server-side." },
              { id: "A06", text: "Product images are hosted remotely (CDN/S3). The frontend only consumes URLs." },
              { id: "A07", text: "Seller analytics data is computed by the backend and served as aggregated metrics. The frontend is not responsible for calculation." },
              { id: "A08", text: "The public marketplace (non-authenticated browsing) is accessible without login." },
              { id: "A09", text: "Messaging between users is in-platform only; no external integrations (email/SMS) required for Part 01." },
              { id: "A10", text: "The design system will be built in Figma Make across multiple parts. Part 01 establishes foundations only." },
            ].map(({ id, text }) => (
              <div key={id} className="flex gap-5 py-3 border-b border-[var(--color-border)] last:border-0">
                <span className="font-[var(--font-mono)] text-[11px] text-[var(--color-ink-muted)] shrink-0 w-8 pt-0.5">{id}</span>
                <p className="text-sm text-[var(--color-ink)] leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="p1-risks" className="mb-14 scroll-mt-24">
          <SectionHeader num="09" title="Risks" />
          <Card className="p-0 overflow-hidden">
            <div className="px-5">
              <Risk level="high" title="Multi-seller checkout complexity" description="A cart spanning multiple sellers requires per-seller order splitting, separate fulfillment flows, and potentially separate delivery tracking. Must be resolved at architecture level before checkout UI design." />
              <Risk level="high" title="Category system flexibility vs. hardcoded UI" description="If any part of the frontend assumes static categories, the system breaks when admins reconfigure them. All category-driven UI must consume API data." />
              <Risk level="medium" title="Seller onboarding drop-off" description="Complex registration flows cause high abandonment. Seller onboarding must be broken into clear, progressed steps with save-and-resume capability." />
              <Risk level="medium" title="Admin data volume at scale" description="Admin dashboards displaying all users, orders, and products will require pagination, search, and filter patterns from day one — not retrofit." />
              <Risk level="medium" title="Courier data consistency" description="Displaying courier/delivery status from a separate mobile system creates dependency on data freshness and API reliability outside this platform's control." />
              <Risk level="low" title="Review manipulation" description="Multi-vendor platforms are targets for fake reviews. Trust indicators and moderation tooling must be factored into the review UX." />
              <Risk level="low" title="Mobile responsiveness regression" description="Complex seller dashboards (data tables, analytics, product grids) can degrade severely on mobile. Requires responsive testing at each phase." />
            </div>
          </Card>
        </section>

        <section id="p1-questions" className="mb-14 scroll-mt-24">
          <SectionHeader num="10" title="Open Questions" />
          <Card className="p-0 overflow-hidden">
            <div className="px-5">
              <Question num="Q1" question="How are delivery fees calculated?" rationale="Per-seller, per-platform, by zone, by weight, or by courier? This determines whether checkout shows a unified or itemized delivery cost." />
              <Question num="Q2" question="Can a buyer message a seller before purchasing?" rationale="Pre-purchase messaging changes trust UX and may require a lightweight inbox feature earlier than anticipated." />
              <Question num="Q3" question="What is the seller commission model?" rationale="Affects seller dashboard analytics display, payout UI, and which financial data sellers can see vs. admins." />
              <Question num="Q4" question="Can sellers manage multiple stores?" rationale="One store per seller account simplifies onboarding and IA significantly. Multiple stores require a store-switcher pattern." />
              <Question num="Q5" question="Are there sub-admin roles?" rationale="A single admin role is simpler; role-scoped admins (catalog admin, user admin, finance admin) require RBAC UI and are significantly more complex." />
              <Question num="Q6" question="What payment gateways are supported?" rationale="Gateway selection affects checkout UX (redirect vs. embedded), error handling, and which card/payment icons appear in the UI." />
              <Question num="Q7" question="Are product variants required at launch?" rationale="Size/color/material variants significantly increase product management complexity. If deferred, the data model must still accommodate them." />
              <Question num="Q8" question="What is the dispute and return flow?" rationale="Determines whether a dedicated dispute UI is needed in buyer, seller, and admin views — including messaging, evidence upload, and resolution states." />
              <Question num="Q9" question="Is guest checkout supported?" rationale="Guest checkout requires session-based cart persistence, post-purchase account creation prompts, and order lookup without login." />
              <Question num="Q10" question="Which analytics dimensions matter most to sellers?" rationale="Views, conversion rate, revenue over time, top products, order volume — prioritizing these determines dashboard complexity for Part 03." />
            </div>
          </Card>
        </section>

        <section id="p1-screens" className="mb-14 scroll-mt-24">
          <SectionHeader num="11" title="Initial Screen Categories" />
          <p className="text-sm text-[var(--color-ink-muted)] mb-5 leading-relaxed">Anticipated primary screen groups across all three web experiences. These will be expanded into full screen inventories in subsequent parts.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[
              { role: "PUBLIC / BUYER", color: "navy" as const, groups: [{ name: "Public Marketplace", screens: ["Home / Discovery","Category browse","Search results","Storefront page"] },{ name: "Product", screens: ["Product detail","Reviews","Related products"] },{ name: "Auth", screens: ["Register","Log in","Forgot password"] },{ name: "Commerce", screens: ["Cart","Checkout","Order confirmation"] },{ name: "Account", screens: ["Dashboard","Orders","Order detail","Wishlist","Addresses","Reviews","Messages","Notifications","Settings"] }] },
              { role: "SELLER", color: "amber" as const, groups: [{ name: "Onboarding", screens: ["Apply as seller","Category selection","Store setup","Verification"] },{ name: "Dashboard", screens: ["Overview","Analytics"] },{ name: "Products", screens: ["Product list","Add product","Edit product","Variants","Inventory"] },{ name: "Orders", screens: ["Order list","Order detail","Process order"] },{ name: "Store", screens: ["Store profile","Promotions","Reviews","Settings"] },{ name: "Account", screens: ["Messages","Notifications","Account settings"] }] },
              { role: "ADMINISTRATOR", color: "violet" as const, groups: [{ name: "Dashboard", screens: ["Platform overview","Analytics"] },{ name: "Users", screens: ["User list","User detail","User management"] },{ name: "Sellers", screens: ["Seller list","Application review","Seller detail"] },{ name: "Catalog", screens: ["Category management","Product oversight","Product moderation"] },{ name: "Orders", screens: ["All orders","Order detail","Courier data view"] },{ name: "Moderation", screens: ["Reports queue","Report detail","Resolution"] },{ name: "Platform", screens: ["Settings","Permissions","Content"] }] },
            ].map(({ role, color, groups }) => {
              const accent: Record<string,string> = { navy: "border-t-[var(--color-navy)]", amber: "border-t-[var(--color-amber)]", violet: "border-t-[var(--color-violet)]" };
              return (
                <div key={role} className={`bg-white border border-[var(--color-border)] border-t-2 ${accent[color]} rounded-sm p-5`}>
                  <div className="mb-4"><Tag color={color}>{role}</Tag></div>
                  <div className="space-y-4">
                    {groups.map(({ name, screens }) => (
                      <div key={name}>
                        <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] tracking-widest uppercase mb-1.5">{name}</p>
                        <div className="flex flex-wrap gap-1">
                          {screens.map(s => <span key={s} className="text-xs bg-[var(--color-surface)] text-[var(--color-ink)] px-2 py-0.5 rounded-sm border border-[var(--color-border)]">{s}</span>)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <div className="border-t border-[var(--color-border)] pt-8 pb-4">
          <p className="font-[var(--font-mono)] text-[11px] text-[var(--color-ink-muted)] tracking-wide">MARKETPLACE·OS — PART 01 of N — FOUNDATION DOCUMENT — 2026-08-15</p>
          <p className="text-xs text-[var(--color-ink-muted)] mt-1">This document is the authoritative source for project scope, role definitions, and design principles. All subsequent design parts reference this foundation.</p>
        </div>
      </main>
    </div>
  );
}
