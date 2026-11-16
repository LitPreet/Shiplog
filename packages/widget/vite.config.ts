import { defineConfig } from "vite";
import preact from "@preact/preset-vite";

// Two modes:
// - `npm run dev`: serves index.html (a fake customer website) with hot reload.
// - `npm run build`: "library mode" bundles everything (Preact + our code +
//   CSS) into ONE self-contained file, dist/widget.js, as an IIFE
//   (Immediately Invoked Function Expression) - a plain script that runs on
//   load and leaks no globals, so it can be dropped into any website.
export default defineConfig({
  plugins: [preact()],
  define: {
    // Library mode doesn't replace this automatically; dependencies that check
    // it would otherwise crash in browsers ("process is not defined").
    "process.env.NODE_ENV": JSON.stringify("production"),
  },
  build: {
    target: "es2019",
    lib: {
      entry: "src/main.tsx",
      name: "Shiplog",
      formats: ["iife"],
      fileName: () => "widget.js",
    },
  },
});
