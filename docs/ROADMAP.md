# Roadmap

## ✅ Phase 1: Core loop
Widget (board, submit, vote) · public API with key/origin/rate-limit security · Postgres schema ·
owner dashboard with status changes.

## Phase 2: Make it a real product
- [x] **Owner auth**: email + password, DB sessions, httpOnly cookie; projects belong to users
- [x] Create projects + manage allowed origins from the dashboard, rotate keys, pause widget
- [x] **Configurable widget**: heading, colour, launcher text, custom form fields (validated server-side)
- [x] **Social sign-in** (GitHub, Google) with safe account linking
- [ ] Password reset + email verification (needs a verified sending domain)
- [ ] **Identified users**: host app passes a signed user ID (HMAC) so votes follow real accounts
- [x] Widget theme: light / dark / auto, chosen in the dashboard
- [x] Unit tests (Vitest) for streaming, prompt-injection guards and privacy filtering
- [ ] Playwright end-to-end tests + GitHub Actions CI

## Phase 3: The differentiators
- [ ] **"You asked, we shipped" notifications**: when status becomes DONE, voters see it in the
      widget (and optionally by email)
- [ ] **Pin feedback to an element**: click any element on the page and attach feedback + a screenshot
- [x] **AI duplicate detection**: trigram search while typing + an LLM check on submit, so
      "xlsx download" is matched to "Export to Excel" (11/12 on a labelled eval set)
- [x] **AI feedback summary**: streamed top themes, quick wins and a recommendation
- [ ] **Merge duplicates** in the dashboard (move votes from one idea into another)
- [ ] **AI weekly digest** by email: trends over time, and churned users who asked for X

## Phase 4: Launch
- [x] Deploy (Vercel + Neon Postgres); widget served from Vercel's CDN
- [x] Landing page
- [ ] Waitlist, Stripe billing
- [ ] Redis rate limiting (shared across serverless instances), error monitoring (Sentry)
- [ ] Major upgrades: Next.js 16, Prisma 7 (clears the remaining build-time `npm audit` advisories)
