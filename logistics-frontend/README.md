# Maketo Logistics Partner Portal

Minimal standalone React/Vite client for `logistics.marketohub.online`. It uses
the shared Maketo identity API and contains only:

- `/login` with shared password and two-factor authentication
- `/access-denied` for authenticated identities without Logistics capability
- `/dashboard` with the authenticated provider/staff/hub context

It is intentionally not a full operations portal.

## Local development

Copy `.env.example` to a local `.env` and set `VITE_API_URL` if needed, then run:

```powershell
npm install
npm run dev
```

The dev server listens on port 8450 (`vite.config.ts` / `npm run dev`). The
Marketplace frontend links here through its own `VITE_LOGISTICS_FRONTEND_URL`
(local `http://localhost:8450`, production `https://logistics.marketohub.online`).

Production verification:

```powershell
npm test
npm run build
npx wrangler deploy --dry-run
```

## Cloudflare deployment (Workers static assets)

This app deploys as its own Cloudflare Worker, separate from the Marketplace
Worker (`frontend/`, `marketohub.online`). Configuration lives in
`wrangler.jsonc` (worker `marketo-logistics`, assets from `dist/`, SPA fallback
so direct requests to `/login`, `/access-denied` and `/dashboard` serve
`index.html`).

Workers Builds settings:

| Setting | Value |
| --- | --- |
| Project name | `marketo-logistics` |
| Root / path | `logistics-frontend` |
| Build command | `npm run build` |
| Deploy command | `npx wrangler deploy` |
| Non-production deploy command | `npx wrangler versions upload` |
| Build variable | `VITE_API_URL=https://maketo-api.onrender.com/api` |

After the first successful deploy, bind the custom domain
`logistics.marketohub.online` to the `marketo-logistics` Worker in the
Cloudflare dashboard (Worker > Settings > Domains & Routes). Do not bind
`marketohub.online` to this Worker.

Only browser-safe `VITE_*` values may be configured for this app. Never add
backend secrets (database, `APP_KEY`, R2, mail or Resend credentials).

The bearer token is kept in `sessionStorage`. Authorization remains backend
owned through `/api/auth/me` and Logistics middleware.
