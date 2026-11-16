// Creates a demo project + sample feedback so the widget has data to show.
// Run with: npm run db:seed
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const project = await prisma.project.upsert({
    where: { publicKey: "pk_demo_123" },
    update: {},
    create: {
      name: "Demo SaaS",
      publicKey: "pk_demo_123",
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
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
