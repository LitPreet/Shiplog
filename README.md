# Shiplog

**In-app feedback boards that close the loop.** Site owners add one `<script>` tag; their users
suggest ideas, vote, and see what's planned, all without leaving the product.

```html
<script src="https://YOUR-DOMAIN/widget.js" data-shiplog-key="pk_..." defer></script>
```

| Part | Tech | Folder |
|---|---|---|
| Embeddable widget | Preact, TypeScript, Vite (library mode), Shadow DOM | `packages/widget` |
| API + dashboard | Next.js 15 (App Router), Route Handlers, Server Actions, Tailwind | `apps/web` |
| Database | PostgreSQL 16 + Prisma | `apps/web/prisma` |

Widget bundle: **~9 KB gzipped**.

## Run locally

Prerequisites: Node 20+, Docker Desktop running.

```bash
npm install                 # install all workspaces
cp apps/web/.env.example apps/web/.env
npm run db:up               # start Postgres in Docker (port 5433)
npm run db:migrate          # create tables
npm run db:seed             # demo user, demo project (key: pk_demo_123) + sample ideas

npm run dev:web             # terminal 1 -> API + dashboard on http://localhost:3000
npm run dev:widget          # terminal 2 -> fake customer site on http://localhost:5173
```

- Open **http://localhost:5173**: a fake customer website with the widget embedded. Post ideas, vote.
- Open **http://localhost:3000/dashboard** and sign in as `demo@shiplog.dev` / `demo12345` (or sign up).
  Change an idea's status and the widget shows it. Under **Widget & settings** you can change the
  heading, colour and form questions, manage allowed websites, rotate the key, or pause the widget.

Build the production widget: `npm run build:widget`. That writes `apps/web/public/widget.js`, served at `/widget.js`.

## Docs

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): how the pieces fit together, with diagrams
- [docs/BUILD_LOG.md](docs/BUILD_LOG.md): how it was built step by step, and why
- [docs/INTERVIEW_NOTES.md](docs/INTERVIEW_NOTES.md): how to explain this project in an interview
- [docs/ROADMAP.md](docs/ROADMAP.md): what's next
