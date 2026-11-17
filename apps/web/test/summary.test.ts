import type { Feedback } from "@prisma/client";
import { describe, expect, it } from "vitest";
import type { FormField } from "../src/lib/form-fields";
import { buildSummaryInput } from "../src/lib/summary";

const fields: FormField[] = [
  { id: "plan", label: "Which plan are you on?", type: "select", required: true, options: ["Free", "Pro"] },
  { id: "email", label: "Email for updates", type: "email", required: false },
];

const item = (over: Partial<Feedback>): Feedback =>
  ({
    id: "1",
    projectId: "p",
    title: "Export to Excel",
    description: null,
    status: "PLANNED",
    voteCount: 10,
    visitorId: "v",
    pageUrl: null,
    answers: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...over,
  }) as Feedback;

describe("buildSummaryInput", () => {
  it("includes dropdown answers but never free-text answers like emails (privacy)", () => {
    const input = buildSummaryInput(
      [
        item({
          answers: [
            { fieldId: "plan", label: "Which plan are you on?", value: "Pro" },
            { fieldId: "email", label: "Email for updates", value: "jane@acme.com" },
          ],
        }),
      ],
      fields,
    );
    expect(input).toContain('"Which plan are you on?":"Pro"');
    expect(input).not.toContain("jane@acme.com");
  });

  it("uses human status labels and caps the number of items sent", () => {
    const many = Array.from({ length: 100 }, (_, i) => item({ id: String(i), status: "DONE" }));
    const parsed = JSON.parse(buildSummaryInput(many, fields));
    expect(parsed.totalIdeas).toBe(100);
    expect(parsed.items).toHaveLength(60);
    expect(parsed.items[0].status).toBe("Shipped");
  });
});
