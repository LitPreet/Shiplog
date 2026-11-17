import { render } from "preact";
import { App } from "./App";
import { createApi } from "./api";
import { readConfig } from "./config";
import { readableInk } from "./color";
// "?inline" = Vite gives us the CSS as a string instead of injecting a <link>
// into the page, so we can put it INSIDE our shadow root.
import styles from "./styles.css?inline";

// Read config NOW: document.currentScript is only available during this
// first synchronous run of the script.
const config = readConfig();

async function mount() {
  if (!config) return;

  // Guard against the customer pasting the script twice.
  if (document.getElementById("shiplog-root")) return;

  // Fetch the owner's settings first. If the key is wrong, the origin isn't
  // allowed, or the project is paused, render NOTHING: a broken widget on a
  // customer's site is worse than no widget.
  const api = createApi(config);
  let settings;
  try {
    settings = await api.config();
  } catch (err) {
    console.warn(`[shiplog] Widget not loaded: ${(err as Error).message}`);
    return;
  }
  if (document.getElementById("shiplog-root")) return; // raced with a second copy

  // 1. A plain host element on the customer's page...
  const host = document.createElement("div");
  host.id = "shiplog-root";
  const accent = config.color ?? settings.accentColor;
  host.style.setProperty("--sl-accent", accent);
  // Text on accent backgrounds: white or dark, whichever is more readable.
  host.style.setProperty("--sl-accent-ink", readableInk(accent));
  document.body.appendChild(host);

  // 2. ...with a Shadow DOM inside it. CSS can't cross the shadow boundary in
  //    either direction: the site's styles don't break us, ours don't break them.
  const shadow = host.attachShadow({ mode: "open" });

  const style = document.createElement("style");
  style.textContent = styles;
  shadow.appendChild(style);

  const container = document.createElement("div");
  shadow.appendChild(container);

  render(<App api={api} settings={settings} />, container);
}

// The script may run in <head> before <body> exists.
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", mount);
} else {
  mount();
}
