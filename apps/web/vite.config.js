import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve } from "node:path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), {
    name: "version-offline-shell",
    apply: "build",
    writeBundle(options) {
      const dir = options.dir || "dist";
      const revision = createHash("sha256").update(readFileSync(resolve(dir, "index.html"))).digest("hex").slice(0, 12);
      const path = resolve(dir, "sw.js");
      writeFileSync(path, readFileSync(path, "utf8").replace("necklink-shell-v1", `necklink-shell-${revision}`));
    },
  }],
  server: { proxy: { "/api": "http://127.0.0.1:5000" } },
});
