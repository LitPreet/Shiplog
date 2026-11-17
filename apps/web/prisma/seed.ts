// Creates a demo project + sample feedback so the widget has data to show.
// Run with: npm run db:seed
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/password";

const prisma = new PrismaClient();

// Sign in to the dashboard with these.
const DEMO_EMAIL = "demo@shiplog.dev";
const DEMO_PASSWORD = "demo12345";

async function main() {
  const user = await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    update: {},
    create: { email: DEMO_EMAIL, name: "Demo User", passwordHash: await hashPassword(DEMO_PASSWORD) },
  });

  const project = await prisma.project.upsert({
    where: { publicKey: "pk_demo_123" },
    update: {},
    create: {
      name: "Demo SaaS",
      ownerId: user.id,
      publicKey: "pk_demo_123",
      // Shows off custom form fields in the widget.
      formFields: [
        { id: "plan", label: "Which plan are you on?", type: "select", required: true, options: ["Free", "Pro", "Business"] },
        { id: "email", label: "Email for updates", type: "email", required: false, placeholder: "you@company.com" },
      ],
      // The widget's dev server (the fake "customer website").
      allowedOrigins: ["http://localhost:5173"],
    },
  });

  const count = await prisma.feedback.count({ where: { projectId: project.id } });
  if (count === 0) {
    await prisma.feedback.createMany({
      data: [
        { projectId: project.id, title: "Export reports to Excel", description: "We need .xlsx exports for finance.", voteCount: 0, visitorId: "seed", status: "PLANNED" },
        { projectId: project.id, title: "Dark mode", visitorId: "seed" },
        { projectId: project.id, title: "Slack notifications for new invoices", visitorId: "seed", status: "IN_PROGRESS" },
      ],
    });
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
