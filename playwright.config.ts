import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/browser",
  workers: 1,
  timeout: 30000,
  reporter: "list",
  use: { baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000", channel: "msedge", headless: true, viewport: { width: 390, height: 844 }, trace: "retain-on-failure" },
});
