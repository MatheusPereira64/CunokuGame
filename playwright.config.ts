import { defineConfig, devices } from "@playwright/test";

const PORT = 5010;

/** Testes de ponta a ponta: sobem o servidor de desenvolvimento e jogam no navegador. */
export default defineConfig({
  testDir: "e2e",
  // .e2e.ts para o vitest (que pega *.test/*.spec) não tentar rodar estes testes
  testMatch: "**/*.e2e.ts",
  timeout: 5 * 60_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } } }],
  webServer: {
    command: `npx cross-env NODE_ENV=development PORT=${PORT} tsx server/index.ts`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
