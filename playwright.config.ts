import { defineConfig, devices } from "@playwright/test";

// Las pruebas usan una base y una carpeta de archivos propias (test.db, storage-test),
// recreadas con los datos de demostración en cada ejecución.
const env = { DATABASE_URL: "file:./test.db", STORAGE_DIR: "./storage-test", APP_SECRET: "e2e-secret-0123456789abcdef0123456789abcdef", SHOW_DEMO_DATA: "true", APP_URL: "http://localhost:3100" };

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3100",
    trace: "retain-on-failure",
    launchOptions: process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {},
  },
  projects: [
    { name: "escritorio", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
  ],
  webServer: {
    command: "rm -rf prisma/test.db storage-test && prisma db push --skip-generate && tsx prisma/seed.ts && next dev -p 3100",
    url: "http://localhost:3100",
    timeout: 180_000,
    reuseExistingServer: false,
    env,
  },
});
