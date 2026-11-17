// Turns the dev demo page (index.html, which loads the widget's TypeScript
// source through Vite) into a production page served by the web app at /demo.
// It loads the built /widget.js from the same server, exactly like a customer
// would.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");

const devTag = /<script\s+type="module"\s+src="\/src\/main\.tsx"[\s\S]*?<\/script>/;
if (!devTag.test(html)) throw new Error("build-demo: dev <script> tag not found in index.html");

const prodTag = `<script src="/widget.js" data-shiplog-key="pk_demo_123" defer></script>`;
const out = html
  .replace(devTag, prodTag)
  .replace("In dev we load the source; in production it's .../widget.js", "Served by Shiplog itself at /demo.");

const dir = new URL("../../../apps/web/public/demo/", import.meta.url);
mkdirSync(dir, { recursive: true });
writeFileSync(new URL("index.html", dir), out);
console.log("✔ demo page written to apps/web/public/demo/index.html");
