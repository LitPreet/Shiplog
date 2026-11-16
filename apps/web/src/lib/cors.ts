// CORS = the browser rule that stops acme.com's JavaScript from reading
// responses from our API (localhost:3000) unless we explicitly allow it.
// The widget runs on the CUSTOMER's site, so every widget API call is
// cross-origin and needs these headers.

const ALLOWED_HEADERS = "Content-Type, X-Shiplog-Key";

export function corsHeaders(origin: string | null): HeadersInit {
  if (!origin) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": ALLOWED_HEADERS,
    "Access-Control-Max-Age": "86400", // browser caches the preflight for 1 day
    Vary: "Origin", // responses differ per origin, so caches must not mix them
  };
}

// Preflight: before a cross-origin POST with JSON, the browser first sends an
// OPTIONS request asking "may I?". Preflights carry no custom header VALUES
// (so we can't see the project key yet), so we answer yes here and do the real
// key + origin check on the actual request (see widget-auth.ts).
export function preflight(req: Request) {
  return new Response(null, { status: 204, headers: corsHeaders(req.headers.get("origin")) });
}

export function json(req: Request, body: unknown, status = 200, extra: HeadersInit = {}) {
  return Response.json(body, {
    status,
    headers: { ...corsHeaders(req.headers.get("origin")), ...extra },
  });
}
