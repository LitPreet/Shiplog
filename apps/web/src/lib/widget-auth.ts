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

  // Browsers omit Origin on same-origin GETs (e.g. the widget on our own /demo
  // page). Sec-Fetch-Site is also browser-set and unforgeable by page JS, so
  // "same-origin" means the request came from this app's own origin, which
  // must still be on the allowlist. (Non-browser clients can fake either
  // header; that's what the rate limits and low-privilege key are for.)
  const origin =
    req.headers.get("origin") ??
    (req.headers.get("sec-fetch-site") === "same-origin" ? new URL(req.url).origin : null);
  if (!origin || !project.allowedOrigins.includes(origin)) {
    return {
      ok: false,
      response: json(req, { error: `Origin ${origin ?? "(none)"} is not allowed for this project` }, 403),
    };
  }

  return { ok: true, project };
}
