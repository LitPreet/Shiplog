# Architecture

## The big picture

```
 Customer's website (acme.com)                    Shiplog server (our Next.js app)
┌──────────────────────────────────┐            ┌─────────────────────────────────────┐
│  <script src=".../widget.js"     │  1. load   │  /widget.js  (static file)          │
│     data-shiplog-key="pk_..">   ─┼───────────▶│                                     │
│                                  │            │  /api/v1/config        GET          │
│                                  │            │  /api/v1/feedback      GET, POST    │
│  ┌─ #shiplog-root ────────────┐  │  2. fetch  │  /api/v1/feedback/:id/vote  POST    │
│  │  shadow root               │◀─┼───────────▶│      │                              │
│  │   └─ Preact <App/>         │  │  (CORS)    │      ▼                              │
│  └────────────────────────────┘  │            │  authenticateWidget()               │
└──────────────────────────────────┘            │   key valid? origin allowed?        │
                                                │      │                              │
 Site owner                                     │      ▼                              │
┌──────────────────────────────────┐            │  Prisma ──▶ PostgreSQL              │
│  /dashboard (browser)           ─┼───────────▶│      ▲                              │
└──────────────────────────────────┘ Server     │  Server Components / Actions        │
                                     Components └─────────────────────────────────────┘
```

There are **two audiences** and they talk to the server differently:

| | End users (in the widget) | Site owner (dashboard) |
|---|---|---|
| Runs on | the customer's domain | our domain |
| Talks via | public REST API + CORS | Server Components + Server Actions |
| Identity | anonymous `visitorId` in localStorage | email + password account, session cookie |
| Trust level | untrusted, public key only | trusted, but only for projects they own |

## Data model

```
Project 1───* Feedback 1───* Vote
  publicKey        title           visitorId
  allowedOrigins   status          @@unique(feedbackId, visitorId)
                   voteCount  ◀── denormalized counter
```

- **Project**: one customer website. `publicKey` goes in the script tag; `allowedOrigins` limits
  which sites may use it.
- **Feedback**: an idea. `voteCount` is stored on the row (not computed with COUNT) because
  "sort by votes" runs on every widget open. It's updated in the **same transaction** as the Vote
  row, so it can't drift.
- **Vote**: the unique index `(feedbackId, visitorId)` means the **database** guarantees one vote
  per visitor, even if two requests arrive at the same instant.

## Request flow: voting

```
click ▲ ──▶ UI updates instantly (optimistic) ──▶ POST /vote
                                                     │
                       authenticateWidget (key + Origin)
                       rateLimit (30/min per IP)
                       validate body (zod)
                       check item belongs to this project
                       transaction { insert/delete Vote; voteCount ±1 }
                                                     │
UI replaces optimistic value with server value ◀─────┘
   (or rolls back + shows a toast on error)
```

## Security model of the public key

The key is **public by design**. Anyone can view the page source and copy it. Layers of defense:

1. **Origin allowlist.** Browsers set the `Origin` header themselves and page JavaScript can't
   change it, so `evil.com` can't use `acme.com`'s key from a browser.
2. **Low-risk capabilities only.** The key can list, submit and vote. It can never delete, change
   statuses, or read owner data.
3. **Rate limiting** per IP, because non-browser clients (curl) *can* fake `Origin`.
4. **Input validation** with zod: length limits, types, URL format.
5. **Cross-project checks.** Voting verifies that the feedback belongs to the key's project.
6. **Kill switch + rotation.** Owners can pause a project (every request gets 403) or rotate the
   key (the old one dies instantly) from the dashboard.
7. **Custom fields are validated against the owner's config**, not the widget: a dropdown answer
   must be one of the configured options, required fields are enforced, unknown keys are dropped.
   Answers are never returned by the public API (they can contain emails).

## AI features

Two layers, cheapest first:

1. **While typing** (`GET /api/v1/feedback/similar`): Postgres `pg_trgm` word similarity on a GIN
   trigram index. No AI, a few milliseconds, debounced in the widget, and stale requests are
   cancelled with `AbortController`.
2. **On submit** (`POST /api/v1/feedback/check`): one LLM call in JSON mode at temperature 0. The
   candidates are the trigram matches plus the most-voted ideas (capped at 30, to keep the prompt
   small). The model may only pick from candidate IDs; anything else is discarded. On timeout
   (5s), rate limit, or no AI configured, it falls back to strict trigram matching.

**Dashboard summary** (`POST /api/projects/:id/summary`) is a Route Handler, not a Server Action,
because it streams. The provider's Server-Sent Events are turned into a plain-text stream
(`sseToText`), the client renders the Markdown progressively (as React elements, never raw HTML),
and "Stop" aborts both the browser request and the upstream LLM call.

`lib/ai.ts` talks to any OpenAI-compatible endpoint (Groq, Ollama, OpenRouter, OpenAI) with
`fetch`. The provider is chosen by `AI_BASE_URL` / `AI_MODEL` / `AI_API_KEY`.

## Owner auth (dashboard)

Hand-written session auth, no library, so every step is explainable:

| Step | What happens |
|---|---|
| Sign up | zod validation → scrypt hash (random salt) → `User` row → session |
| Session | 32 random bytes in an `httpOnly`, `SameSite=Lax` cookie; DB stores only `sha256(token)` |
| Request | `getCurrentUser()` hashes the cookie, looks up an unexpired `Session` (memoised per request) |
| Authorization | `requireProject(id)` loads the project **only if `ownerId` = current user**, else 404 |
| Sign out | delete the `Session` row + clear the cookie (instant revocation, unlike a JWT) |

**Social sign-in** (`lib/oauth.ts`, `/api/auth/:provider` and `/callback`) uses the OAuth 2.0
authorization code flow with a `state` cookie (against login CSRF) and PKCE S256. The code is
exchanged server-side with the client secret. Only provider-verified emails are accepted. Linking
rules (`decideLink`, unit-tested):

| Situation | Result |
|---|---|
| This GitHub/Google identity is already linked | Sign in as that user |
| A user with the same email exists | Link the identity. If that account has a password but no linked provider, the password was never proven, so it and its sessions are revoked (pre-account-takeover protection). |
| Nobody has this email | Create a user with no password |

Password login checks a dummy hash when there's no password to compare, so response time doesn't
reveal which emails have accounts.

`middleware.ts` only checks that a cookie *exists* (fast redirect to `/login`). It is not the
security boundary: every page and every Server Action calls `requireUser`/`requireProject`, because
Server Actions are public HTTP endpoints anyone can call.

## Why these technologies

| Choice | Why | Alternative considered |
|---|---|---|
| Preact for the widget | ~4 KB vs ~45 KB for React. It loads on *other people's* sites, so every KB is their page speed | React (too heavy), vanilla JS (harder to maintain) |
| Shadow DOM | style isolation in both directions | iframe (heavier, harder to resize/position, but stronger isolation) |
| Vite library mode, IIFE | one self-contained file, no globals, works with any site | ES module (needs `type="module"`, older setups break) |
| Next.js App Router | API + dashboard in one deployable app; Server Components query the DB directly | Separate Express API + React SPA (more moving parts) |
| Postgres + Prisma | relational data, transactions, unique constraints; Prisma gives typed queries + migrations | MongoDB (no need for schemaless here) |
| npm workspaces | one repo, shared install, simple | Turborepo/pnpm (worth it later, overkill now) |
