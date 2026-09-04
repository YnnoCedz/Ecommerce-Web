# Maketo Logistics Partner Portal

Minimal standalone React/Vite client for `logistics.marketohub.online`. It uses
the shared Maketo identity API and contains only:

- `/login` with shared password and two-factor authentication
- `/access-denied` for authenticated identities without Logistics capability
- `/dashboard` with the authenticated provider/staff/hub context

It is intentionally not a full operations portal.

Copy `.env.example` to a local `.env` and set the API URL if needed, then run:

```powershell
npm install
npm run dev
```

Production verification:

```powershell
npm run build
```

The bearer token is kept in `sessionStorage`. Authorization remains backend
owned through `/api/auth/me` and Logistics middleware.
