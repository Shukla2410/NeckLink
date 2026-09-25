import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./test",
  timeout: 45000,
  workers: 1,
  use: {
    baseURL: process.env.E2E_BASE_URL || "http://127.0.0.1:5000",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  outputDir: "../../artifacts/browser-tests",
  reporter: "list",
});
