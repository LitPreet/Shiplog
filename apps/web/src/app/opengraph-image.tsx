import { ImageResponse } from "next/og";

// The card shown when the site URL is shared (LinkedIn, Slack, X, iMessage).
// Generated at build time from code, so it always matches the brand.
export const alt = "Shiplog: in-app feedback boards that close the loop";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const IDEAS = [
  { votes: 43, title: "Export reports to Excel", status: "In progress", color: "#b45309", bg: "#fef3c7" },
  { votes: 38, title: "Recurring invoices", status: "Planned", color: "#1d4ed8", bg: "#dbeafe" },
  { votes: 29, title: "Slack alerts when paid", status: "Shipped", color: "#15803d", bg: "#dcfce7" },
];

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#fafaf8", padding: 72, fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: 40, width: 600 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ width: 56, height: 56, borderRadius: 14, background: "#ff5b2e", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12a7 7 0 1 1-3.2-5.9" />
                <path d="M16.5 2.8l-.7 3.3 3.3.7" />
                <circle cx="12" cy="12" r="1.6" fill="white" stroke="none" />
              </svg>
            </div>
            <div style={{ fontSize: 40, fontWeight: 700, color: "#0e0e10" }}>Shiplog</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 76, fontWeight: 700, color: "#0e0e10", lineHeight: 1.02, letterSpacing: -2 }}>Hear users.</div>
            <div style={{ fontSize: 76, fontWeight: 700, color: "#0e0e10", lineHeight: 1.02, letterSpacing: -2, display: "flex" }}>
              <span style={{ color: "#ff5b2e" }}>Ship</span>
              <span>{"\u00a0what matters."}</span>
            </div>
            <div style={{ fontSize: 28, color: "#6b6b76", marginTop: 24, lineHeight: 1.35 }}>
              One script tag. Users suggest ideas, vote, and see what ships. AI catches duplicate requests.
            </div>
          </div>
          <div style={{ fontSize: 22, color: "#6b6b76" }}>Next.js · Preact · Postgres · AI</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16, marginLeft: 56, alignSelf: "center", width: 420, padding: 28, background: "white", borderRadius: 28, border: "2px solid #e7e5e0", boxShadow: "0 30px 80px -20px rgba(0,0,0,0.25)" }}>
          <div style={{ fontSize: 26, fontWeight: 700, color: "#0e0e10" }}>Share feedback</div>
          {IDEAS.map((i) => (
            <div key={i.title} style={{ display: "flex", alignItems: "center", gap: 16, padding: 16, borderRadius: 16, border: "2px solid #ebe9e4" }}>
              <div style={{ width: 56, height: 56, borderRadius: 12, border: "2px solid #ebe9e4", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 700, color: "#0e0e10" }}>
                {i.votes}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: "#0e0e10" }}>{i.title}</div>
                <div style={{ display: "flex", fontSize: 16, fontWeight: 700, color: i.color, background: i.bg, padding: "4px 12px", borderRadius: 999, alignSelf: "flex-start" }}>
                  {i.status}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
