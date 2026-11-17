// Reads settings from the <script> tag the customer pasted:
//   <script src=".../widget.js" data-shiplog-key="pk_..." data-shiplog-api="..."></script>

export type Config = {
  key: string;
  apiBase: string;
  // Optional override; normally the accent comes from the dashboard settings.
  color?: string;
};

export function readConfig(): Config | null {
  // document.currentScript = "the <script> tag currently executing". It's only
  // set while a classic script first runs (null for type="module" in dev, and
  // null later in callbacks), so we also fall back to an attribute selector.
  const script =
    (document.currentScript as HTMLScriptElement | null) ??
    document.querySelector<HTMLScriptElement>("script[data-shiplog-key]");

  const key = script?.dataset.shiplogKey;
  if (!script || !key) {
    console.warn("[shiplog] Missing data-shiplog-key on the script tag; widget not loaded.");
    return null;
  }

  // Default API = wherever widget.js itself was served from (our server), so
  // customers normally don't need to set data-shiplog-api at all.
  const apiBase = script.dataset.shiplogApi ?? new URL(script.src, location.href).origin;

  return { key, apiBase: apiBase.replace(/\/$/, ""), color: script.dataset.shiplogColor };
}
