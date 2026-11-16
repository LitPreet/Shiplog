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

**Q: How would you scale it?**
Serve `widget.js` from a CDN with long caching and versioned filenames. Move the rate limiter to
Redis so all server instances share counters. Cache the public board for a few seconds per project
(it's read-heavy). Add a read replica if needed. The widget already avoids load by fetching only
when opened.

**Q: What would you do differently?**
Add end-to-end tests (Playwright) earlier, and design the identified-users flow from day one.

## Numbers to quote (update as you go)
- Widget: ~9 KB gzipped
- Race test: 10 parallel votes, 0 counter drift
- (Later: users, projects, p95 API latency, Lighthouse impact on host page)
