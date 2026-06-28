import { test } from '@playwright/test';

test.describe('Visual Screenshots', () => {
  // Participant Page viewports
  for (const width of [320, 375, 768]) {
    test(`Participant page at width ${width}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto('/');
      await page.screenshot({ path: `e2e/screenshots/participant-${width}.png` });
    });
  }

  // Presenter Page viewports (requires auth)
  for (const width of [1024, 1440, 1920]) {
    test(`Presenter page at width ${width}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 1080 });
      await page.goto('/');

      // Trigger secret access
      const logo = page.getByTestId('brand-logo');
      for (let i = 0; i < 5; i++) {
        await logo.click();
      }

      await page.getByLabel('กรอกรหัสผ่าน (PIN)').fill('123456');
      await page.getByRole('button', { name: 'ยืนยัน' }).click();
      await page.waitForURL('/presenter');

      // Wait 500ms for Socket.IO connection and animations
      await page.waitForTimeout(500);
      await page.screenshot({ path: `e2e/screenshots/presenter-${width}.png` });
    });
  }
});
