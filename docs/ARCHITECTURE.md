# Architecture

## The big picture

```
 Customer's website (acme.com)                    Shiplog server (our Next.js app)
┌──────────────────────────────────┐            ┌─────────────────────────────────────┐
│  <script src=".../widget.js"     │  1. load   │  /widget.js  (static file)          │
│     data-shiplog-key="pk_..">   ─┼───────────▶│                                     │
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
| Identity | anonymous `visitorId` in localStorage | (Phase 2: real login) |
| Trust level | untrusted, public key only | trusted (once auth exists) |

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

## Why these technologies

| Choice | Why | Alternative considered |
|---|---|---|
| Preact for the widget | ~4 KB vs ~45 KB for React. It loads on *other people's* sites, so every KB is their page speed | React (too heavy), vanilla JS (harder to maintain) |
| Shadow DOM | style isolation in both directions | iframe (heavier, harder to resize/position, but stronger isolation) |
| Vite library mode, IIFE | one self-contained file, no globals, works with any site | ES module (needs `type="module"`, older setups break) |
| Next.js App Router | API + dashboard in one deployable app; Server Components query the DB directly | Separate Express API + React SPA (more moving parts) |
| Postgres + Prisma | relational data, transactions, unique constraints; Prisma gives typed queries + migrations | MongoDB (no need for schemaless here) |
| npm workspaces | one repo, shared install, simple | Turborepo/pnpm (worth it later, overkill now) |
