# Explaining Shiplog in an interview

## 30-second pitch
> "I built Shiplog, an embeddable feedback platform. A SaaS company adds one script tag, and their
> users can suggest features and vote on them inside the product. The owner manages everything from
> a dashboard. The widget is Preact rendered inside Shadow DOM, about 9 KB gzipped, so it can't break
> or be broken by the host site's CSS. The backend is Next.js with Postgres, and the public API is
> secured with project keys, an origin allowlist and rate limiting."

## Questions you'll likely get (and your answers)

**Q: Why Shadow DOM and not an iframe?**
Shadow DOM isolates CSS both ways while staying in the page, so positioning, resizing and
animations are simple and there's no extra document to load. An iframe gives stronger isolation
(separate JS context too), but it's heavier and awkward for a floating panel. Intercom uses iframes;
for a small widget Shadow DOM was the better trade-off.

**Q: The API key is visible in page source. Isn't that insecure?**
It's a *public* key, like a Stripe publishable key. Security comes from layers: an origin
allowlist (browsers set `Origin` and page JS can't fake it), the key can only do low-risk actions,
per-IP rate limiting for non-browser clients, input validation, and checks that a feedback ID
belongs to the key's project.

**Q: How do you stop someone voting twice?**
Each visitor has a random ID in localStorage, and the database has a unique index on
`(feedbackId, visitorId)`. The guarantee lives in the database, not just app code, so even two
simultaneous requests can't both succeed. I tested it with 10 parallel requests. Honest limitation:
clearing localStorage gives a new identity. Phase 2 adds identified users, where the host app passes
a signed user ID.

**Q: Why store voteCount instead of counting votes?**
Sorting by votes happens on every widget open, so it's a read-heavy path. A stored counter is
indexed and sortable. The risk is drift, so it's updated in the same transaction as the vote row.

**Q: What's an optimistic update, and what happens on failure?**
The UI shows the new vote immediately, before the server answers, so it feels instant. When the
server responds I replace the value with the server's truth; if it fails I restore that item and
show a message.

**Q: How does CORS work here?**
The widget runs on acme.com and calls our API on another domain. For JSON POSTs with custom
headers, the browser first sends an OPTIONS preflight. We answer it, then the real request is
checked against the project's allowed origins, and the response includes
`Access-Control-Allow-Origin` with `Vary: Origin`.

**Q: How does auth work? Why not a library?**
Email + password, hashed with scrypt (salted, memory-hard), compared with `timingSafeEqual`.
On login we create a random token, put it in an httpOnly SameSite=Lax cookie, and store only its
SHA-256 in a `Session` table, so a DB leak can't be replayed as logins. I chose DB sessions over JWTs
because logout and revocation are instant. I wrote it by hand to show I understand it; in a team
I'd likely use Auth.js or a provider and add OAuth, email verification and password reset.

**Q: What stops one owner from editing another owner's project?**
Every Server Action and page starts with `requireProject(id)`, which queries
`where: { id, ownerId: currentUser.id }` and returns 404 otherwise (404, not 403, so you can't
probe which IDs exist). Middleware is just a fast redirect, not the security check, because Server
Actions are public POST endpoints.

**Q: The key is in the page source. Can't anyone paste it on their site?**
No: requests are checked against the project's allowed origins, which the browser sets and page JS
can't fake. For curl-style abuse there's per-IP rate limiting, low-privilege keys, key rotation and
a pause switch. Accounts are capped at 5 projects to limit signup abuse.

**Q: How do custom form fields work?**
The owner's field config is JSON on the project, validated with zod when saved. The widget
fetches it from `GET /api/v1/config` and renders it. On submit the server validates the answers
against the same config (required, email format, dropdown value must be an allowed option) and
stores a snapshot `{fieldId, label, value}`, so old feedback still reads correctly after a field
is renamed or deleted.

**Q: You changed the schema with live data. How?**
`ownerId` became required, but existing projects had no owner. I edited the generated migration
to add the column as nullable, backfill orphans to a demo user, then set NOT NULL, instead of
resetting the database.

**Q: How would you scale it?**
Serve `widget.js` from a CDN with long caching and versioned filenames. Move the rate limiter to
Redis so all server instances share counters. Cache the public board for a few seconds per project
(it's read-heavy). Add a read replica if needed. The widget makes one small request per page load
(its config, browser-cached for 60s) and loads the board only when opened.

**Q: What would you do differently?**
Add end-to-end tests (Playwright) earlier, and design the identified-users flow from day one.

## Numbers to quote (update as you go)
- Widget: ~9 KB gzipped
- Race test: 10 parallel votes, 0 counter drift
- (Later: users, projects, p95 API latency, Lighthouse impact on host page)
