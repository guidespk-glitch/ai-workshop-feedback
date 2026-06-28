import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'MOCK_DATABASE=true PORT=3000 NODE_ENV=production DATABASE_HOST=127.0.0.1 DATABASE_PORT=3306 DATABASE_NAME=test DATABASE_USER=root DATABASE_PASSWORD=test SESSION_SECRET=12345678901234567890123456789012 COOKIE_SECRET=12345678901234567890123456789012 PRESENTER_PIN_HASH=\'$argon2id$v=19$m=65536,t=3,p=4$Bv0ZBH+OSZlawsgYxlQGRg$9wwq6rl9PInYDL2UQ9SwL1DvZsrgQeGCOGyz81eNEug\' APP_ORIGIN=http://127.0.0.1:3000 node server.js',
    url: 'http://127.0.0.1:3000/health',
    reuseExistingServer: !process.env.CI,
    timeout: 15 * 1000,
  },
});
