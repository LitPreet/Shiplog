# Roadmap

## ✅ Phase 1: Core loop
Widget (board, submit, vote) · public API with key/origin/rate-limit security · Postgres schema ·
owner dashboard with status changes.

## Phase 2: Make it a real product
- [x] **Owner auth**: email + password, DB sessions, httpOnly cookie; projects belong to users
- [x] Create projects + manage allowed origins from the dashboard, rotate keys, pause widget
- [x] **Configurable widget**: heading, colour, launcher text, custom form fields (validated server-side)
- [ ] Password reset + email verification
- [ ] **Identified users**: host app passes a signed user ID (HMAC) so votes follow real accounts
- [x] Widget theme: light / dark / auto, chosen in the dashboard
- [ ] Playwright end-to-end tests + GitHub Actions CI

## Phase 3: The differentiators
- [ ] **"You asked, we shipped" notifications**: when status becomes DONE, voters see it in the
      widget (and optionally by email)
- [ ] **Pin feedback to an element**: click any element on the page and attach feedback + a screenshot
- [ ] **AI duplicate merging**: embeddings + clustering, so "export to excel" and "xlsx download"
      become one idea
- [ ] **AI weekly digest**: top themes, trends, and churned users who asked for X

## Phase 4: Launch
- [ ] Deploy (Vercel + Neon/Supabase Postgres), widget on a CDN
- [x] Landing page
- [ ] Waitlist, Stripe billing
- [ ] Redis rate limiting, error monitoring (Sentry)
