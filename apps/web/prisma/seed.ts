// Creates a demo account, a demo project and realistic sample feedback.
// Run with: npm run db:seed (safe to re-run: existing data is left alone).
import { PrismaClient, type FeedbackStatus } from "@prisma/client";
import { DEMO_EMAIL, DEMO_PASSWORD } from "../src/lib/demo";
import { hashPassword } from "../src/lib/password";

const prisma = new PrismaClient();


const PLANS = ["Free", "Pro", "Business"];

type SeedIdea = { title: string; description?: string; status?: FeedbackStatus; votes: number; daysAgo: number; plan?: string; page?: string };

const IDEAS: SeedIdea[] = [
  { title: "Export reports to Excel", description: "Finance needs .xlsx exports for month-end close. CSV breaks our currency formatting.", status: "IN_PROGRESS", votes: 42, daysAgo: 21, plan: "Business", page: "/reports" },
  { title: "Recurring invoices", description: "We bill the same 30 retainer clients every month. Let us schedule them.", status: "PLANNED", votes: 37, daysAgo: 18, plan: "Pro", page: "/invoices" },
  { title: "Slack alerts when an invoice is paid", status: "DONE", votes: 29, daysAgo: 30, plan: "Pro", page: "/settings/integrations" },
  { title: "Partial payments", description: "Some customers pay in two or three instalments.", status: "PLANNED", votes: 24, daysAgo: 12, plan: "Business", page: "/payments" },
  { title: "Dark mode", description: "Late-night bookkeeping is real.", status: "DONE", votes: 19, daysAgo: 40, plan: "Free" },
  { title: "Multi-currency support", description: "Half our customers are in the EU.", votes: 16, daysAgo: 6, plan: "Business", page: "/invoices/new" },
  { title: "Custom invoice templates with our logo", votes: 11, daysAgo: 4, plan: "Pro", page: "/settings/branding" },
  { title: "Bulk-send payment reminders", votes: 7, daysAgo: 2, plan: "Free", page: "/invoices" },
  { title: "Crypto payments", votes: 2, daysAgo: 9, status: "CLOSED", plan: "Free" },
];

// The widget dev server, plus the deployed app itself (its /demo page embeds
// the widget). Set APP_URL when seeding production.
const DEMO_ORIGINS = ["http://localhost:5173", ...(process.env.APP_URL ? [new URL(process.env.APP_URL).origin] : [])];

async function main() {
  // Say which database we're about to write to (host only, never the password).
  const target = process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL).host : "(DATABASE_URL not set)";
  console.log(`Seeding database at ${target}`);
  // APP_URL means "seed the deployed app". Refuse if we'd write to localhost.
  if (process.env.APP_URL && /^(localhost|127\.0\.0\.1)(:|$)/.test(target)) {
    throw new Error("APP_URL is set but DATABASE_URL points at localhost. Pass the Neon URL in the same command.");
  }

  const user = await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    update: {},
    create: { email: DEMO_EMAIL, name: "Demo User", passwordHash: await hashPassword(DEMO_PASSWORD) },
  });

  const project = await prisma.project.upsert({
    where: { publicKey: "pk_demo_123" },
    // Re-running the seed adds any missing demo origins (e.g. after deploying).
    update: { allowedOrigins: DEMO_ORIGINS },
    create: {
      name: "Acme Invoices",
      ownerId: user.id,
      publicKey: "pk_demo_123",
      allowedOrigins: DEMO_ORIGINS,
      widgetTitle: "Help shape Acme Invoices",
      widgetSubtitle: "Vote on ideas or suggest your own.",
      accentColor: "#4338ca",
      titlePlaceholder: "e.g. Recurring invoices",
      // Shows off custom form fields in the widget.
      formFields: [
        { id: "plan", label: "Which plan are you on?", type: "select", required: true, options: PLANS },
        { id: "email", label: "Email for updates", type: "email", required: false, placeholder: "you@company.com" },
      ],
    },
  });

  const count = await prisma.feedback.count({ where: { projectId: project.id } });
  if (count === 0) {
    for (const idea of IDEAS) {
      const createdAt = new Date(Date.now() - idea.daysAgo * 24 * 60 * 60 * 1000);
      await prisma.feedback.create({
        data: {
          projectId: project.id,
          title: idea.title,
          description: idea.description,
          status: idea.status ?? "OPEN",
          visitorId: "seed-0",
          pageUrl: idea.page ? `https://app.acme-invoices.dev${idea.page}` : undefined,
          answers: idea.plan ? [{ fieldId: "plan", label: "Which plan are you on?", value: idea.plan }] : [],
          createdAt,
          // Real Vote rows, so voteCount matches the votes table exactly.
          voteCount: idea.votes,
          votes: { create: Array.from({ length: idea.votes }, (_, i) => ({ visitorId: `seed-${i}`, createdAt })) },
        },
      });
    }
  }

  console.log(`Seeded project "${project.name}" with key ${project.publicKey}`);
  console.log(`Dashboard login: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
