# Build log

A step-by-step record of how Shiplog was built and **why** each decision was made.
Read this before an interview.

---

## Phase 1: Core loop (submit → vote → owner sets status → users see it)

### Step 1: Monorepo setup
- Root `package.json` with **npm workspaces** (`apps/*`, `packages/*`), so one `npm install`
  covers everything and scripts like `npm run dev:web` work from the root.
- `apps/web` was created with `create-next-app` (TypeScript, Tailwind, App Router, `src/`).
- `packages/widget` was set up by hand with Vite + Preact.
- **Gotcha:** npm 11 blocks package install scripts by default (supply-chain protection). Prisma
  and esbuild need theirs to download binaries, so they were approved explicitly. The list is in
  `allowScripts` in the root `package.json`.
- **Gotcha:** the Preact Vite plugin pulled in its own newer Preact/Vite. Two copies of Preact on
  a page breaks things, so the root `overrides` field forces one version.

### Step 2: Database (Docker + Prisma)
- `docker-compose.yml` runs Postgres 16 on port **5433**, so it doesn't clash with a locally
  installed Postgres.
- `prisma/schema.prisma` has three models: Project, Feedback, Vote (see ARCHITECTURE.md).
- `npx prisma migrate dev --name init` generated the SQL migration in `prisma/migrations/`.
  Migrations are committed to git, which gives a history of every schema change.
- `prisma/seed.ts` creates a demo project with key `pk_demo_123`.

### Step 3: Server building blocks (`apps/web/src/lib`)
| File | Job |
|---|---|
| `db.ts` | One shared PrismaClient (hot reload would otherwise leak DB connections) |
| `cors.ts` | CORS headers + preflight handler + `json()` helper |
| `widget-auth.ts` | Resolve project from `X-Shiplog-Key`, check `Origin` against the allowlist |
| `validation.ts` | zod schemas for every input |
| `rate-limit.ts` | In-memory fixed-window limiter (Redis later) |

### Step 4: Public API (`apps/web/src/app/api/v1`)
- `GET /feedback`: board sorted by votes; includes `hasVoted` for the current visitor.
- `POST /feedback`: create an idea. The submitter auto-upvotes, using a nested create, so it's one
  transaction.
- `POST /feedback/:id/vote`: toggles the vote inside `$transaction`. If two requests race, the
  unique index rejects the duplicate (Prisma error `P2002`) and we return the current state.
- Versioned under `/v1` so the API can change later without breaking widgets already embedded on
  customer sites, which we can't redeploy.

**Tested with curl:** missing key → 401, wrong key → 401, wrong origin → 403, short title → 400,
6th submit in a minute → 429. For races, 10 parallel vote toggles left `voteCount` exactly equal to
the real number of Vote rows.

### Step 5: The widget (`packages/widget/src`)
| File | Job |
|---|---|
| `main.tsx` | Entry: read config, create host div, attach **Shadow DOM**, inject CSS, render |
| `config.ts` | Read `data-shiplog-*` attributes from the script tag |
| `visitor.ts` | Anonymous visitor ID in localStorage (with fallback if storage is blocked) |
| `api.ts` | Typed fetch client; the only place that knows URLs and headers |
| `App.tsx` | UI: launcher, tabs, board, form, toast |
| `styles.css` | Imported with `?inline` as a string, then placed inside the shadow root |

Key UI decisions:
- **Lazy fetch.** Nothing is requested until the panel opens, so visitors who never click cost nothing.
- **Optimistic voting.** The UI updates instantly; on error only that item is rolled back.
- **No re-sorting after a vote.** Items jumping under the cursor is bad UX.
- **Skeleton loading** instead of a spinner, so the layout doesn't jump.
- **Accessibility:** `aria-pressed` on vote buttons, `role="dialog"`, Escape closes the panel and
  returns focus to the launcher, visible focus rings.
- **Mobile:** below 480px the panel becomes a full-width bottom sheet.

**Proof of isolation:** the demo page (`index.html`) sets `button { background: hotpink !important }`
and Georgia on everything. The widget is unaffected.

**Build:** `vite build` in library mode produces `dist/widget.js` (an IIFE, ~9 KB gzipped), which
is copied to `apps/web/public/` so Next.js serves it at `/widget.js`.

### Step 6: Owner dashboard (`apps/web/src/app/dashboard`)
- `page.tsx` and `[projectId]/page.tsx` are **Server Components**. They query Prisma directly, with
  no API layer and no client-side fetching.
- `status-select.tsx` is the only **Client Component** (it needs `onChange`). It calls a
  **Server Action** (`actions.ts`) and then `revalidatePath` re-renders the page with fresh data.
- ⚠️ No auth yet. That is the first item in Phase 2.

### Step 7: Accounts, project management, configurable widget
**Why:** without login anyone could open the dashboard and change any project, and owners had no
way to manage origins or adapt the form to their product.

| Piece | Where |
|---|---|
| `User`, `Session` models; `Project.ownerId`, widget settings, `formFields`; `Feedback.answers` | `prisma/schema.prisma` |
| Hand-edited migration that backfills existing projects to a demo user | `prisma/migrations/*_auth_and_widget_config` |
| scrypt password hashing | `src/lib/password.ts` |
| Sessions, `requireUser`, `requireProject` (ownership) | `src/lib/auth.ts` |
| Cookie-presence redirect for `/dashboard` | `src/middleware.ts` |
| Sign up / sign in pages + actions (rate limited, no account enumeration, safe `next` redirect) | `src/app/(auth)` |
| Create project (5 per account), settings page: install, widget editor with live preview, origins, key rotation, pause, delete | `src/app/dashboard` |
| Field config schema + server-side answer validation | `src/lib/form-fields.ts` |
| `GET /api/v1/config`; paused projects rejected in `widget-auth.ts` | `src/app/api/v1` |
| Widget renders heading, launcher text, colour and custom fields from config | `packages/widget/src` |

**Tested:** with curl (wrong origin → 403, bad key → 401, paused → 403, missing required field,
dropdown value not in options, and bad email → 400, unknown answer keys dropped), plus a Chrome run
covering signup, short password rejected by the server, project creation, origin normalisation,
saving widget settings, a second user getting 404 on the first user's project, sign out, wrong
password, and answers showing in the dashboard.
