import type { Project } from "@prisma/client";
import { db } from "./db";
import { json } from "./cors";

// Every widget request must say which project it belongs to (public key) and
// come from a website that project owner allowed (Origin header).
//
// Why the origin check matters: the key is visible in the customer's HTML, so
// anyone can copy it. The browser sets the Origin header itself and page JS
// can't fake it, so evil.com can't use acme.com's key from a browser.
// (A script like curl CAN fake Origin, which is why the key only allows
// low-risk actions and we also rate-limit.)

type AuthResult = { ok: true; project: Project } | { ok: false; response: Response };

export async function authenticateWidget(req: Request): Promise<AuthResult> {
  const key = req.headers.get("x-shiplog-key");
  if (!key) {
    return { ok: false, response: json(req, { error: "Missing X-Shiplog-Key header" }, 401) };
  }

  const project = await db.project.findUnique({ where: { publicKey: key } });
  if (!project) {
    return { ok: false, response: json(req, { error: "Unknown project key" }, 401) };
  }

  // Owner paused the widget from the dashboard.
  if (!project.isActive) {
    return { ok: false, response: json(req, { error: "This feedback board is paused" }, 403) };
  }

  const origin = req.headers.get("origin");
  if (!origin || !project.allowedOrigins.includes(origin)) {
    return {
      ok: false,
      response: json(req, { error: `Origin ${origin ?? "(none)"} is not allowed for this project` }, 403),
    };
  }

  return { ok: true, project };
}
