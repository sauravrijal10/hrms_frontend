# HRMS Frontend

Next.js 16 (App Router) + TypeScript + Tailwind CSS v4 UI for the [HRMS Spring Boot API](../hrms).

## Run it

**With Docker (everything):** from the `hrms` folder:

```bash
docker compose up --build -d
```

- Frontend: http://localhost:3000
- API: http://localhost:8081

**Locally (hot reload):** start the API and database with Docker, then run the dev server:

```bash
cd ../hrms && docker compose up -d postgres app
cd ../hrms_frontend
npm install
npm run dev          # http://localhost:3000
```

The API URL defaults to `http://localhost:8081`. To change it, copy `.env.example` to `.env.local`.

| Variable | Purpose |
|---|---|
| `HRMS_API_URL` | Where the **Next.js server** reaches the API (`http://app:8080` inside compose) |
| `COOKIE_SECURE` | `true` when served over HTTPS |

## Two interfaces

| | Company HR app | Platform console |
|---|---|---|
| URL | http://localhost:3000 | http://localhost:3000/platform |
| Who | HR admins, managers, employees of **one** company | Super users who manage **all** companies |
| Sign in | company ID + email + password | email + password |
| Cookie | `hrms_token` | `hrms_platform_token` |
| API | `/api/v1/*` | `/api/v1/platform/*` only |

Create the first super user with `../hrms/create-superuser.sh --email=you@example.com`. From the console they can
create companies with a first HR admin, add more HR admins, reset their passwords, deactivate them, edit company
settings, and suspend or reactivate a company. Super users never see a company's HR records.

Both sessions can be open in the same browser. The proxy sends the platform cookie only for `/platform/*` API
calls, and the API rejects each token type on the other side.

## How auth works

```
Browser ──► Next.js (localhost:3000) ──► Spring API (/api/v1)
            │
            ├─ /api/auth/login|register  sets the JWT in an httpOnly, SameSite=Lax cookie
            ├─ /api/auth/logout          clears it
            ├─ /api/platform-auth/*      same for super users (hrms_platform_token)
            └─ /api/backend/*            proxies to /api/v1/* and adds "Authorization: Bearer <jwt>"
```

- Browser JavaScript never sees the token, and there's no CORS because everything is same-origin.
- `src/proxy.ts` sends visitors without a cookie to `/login`.
- `src/app/(app)/layout.tsx` checks the token with `/auth/me`. An expired token signs you out.
- Menus are hidden by role, but the API enforces every rule itself.

## Pages

| Page | Who |
|---|---|
| `/login`, `/register` | public (register creates a company and its HR admin) |
| `/dashboard` | everyone: balances, recent requests, pending approvals, holidays |
| `/leave` | apply for leave, see history, cancel |
| `/approvals` | managers (anyone with direct reports) and HR |
| `/team` | managers: direct reports |
| `/holidays` | everyone (HR can add or remove) |
| `/profile` | own details, contact info, change password |
| `/employees`, `/employees/new`, `/employees/[id]` | HR: list, create (with login), edit, adjust balances |
| `/departments`, `/leave-types` | HR |
| `/leave-requests` | HR: company-wide search, approve or reject |
| `/settings` | HR: company name, timezone, weekend days, yearly allocation |
| `/platform/login` | public: super user sign in |
| `/platform` | super user: all companies with counts, search |
| `/platform/tenants/new`, `/platform/tenants/[id]` | super user: create, edit, suspend company; manage its HR admins |
| `/platform/account` | super user: change password |

## Project layout

```
src/
├── proxy.ts                     redirect to /login when there's no session cookie
├── lib/
│   ├── api.ts                   client fetch helper + useApi hook (RFC 7807 errors → ApiError)
│   ├── server.ts                server-side fetch, login/register cookie handling
│   ├── types.ts                 TypeScript mirrors of the API DTOs
│   └── format.ts, hooks.ts, timezones.ts
├── components/
│   ├── ui.tsx                   buttons, inputs, cards, tables, modal, badges
│   ├── Shell.tsx                sidebar + mobile drawer
│   ├── session.tsx              session context and toasts
│   ├── leave.tsx                balance cards, request table, approve/reject dialog
│   └── EmployeeForm.tsx         create/edit employee
└── app/
    ├── (auth)/login, register
    ├── (app)/…                  signed-in pages (layout loads the session)
    └── api/auth/*, api/backend/[...path]
```
