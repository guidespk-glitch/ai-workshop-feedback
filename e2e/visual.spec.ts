import { expect, test } from '@playwright/test';

test.describe('Visual Screenshots', () => {
  // Participant Page viewports
  for (const width of [320, 375, 768]) {
    test(`Participant page at width ${width}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto('/');
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({ path: `e2e/screenshots/participant-${width}.png` });
    });
  }

  // Presenter Page viewports (requires auth)
  for (const width of [1024, 1440, 1920]) {
    test(`Presenter page at width ${width}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 1080 });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto('/');

      const sampleByWidth = {
        1024: { answers: ['AI', 'สร้างสรรค์', 'ประยุกต์ใช้'], emojis: ['ว้าว', 'สนุกสนาน'] },
        1440: { answers: ['AI', 'เครื่องมือ', 'ห้องเรียน'], emojis: ['ว้าว', 'รัก'] },
        1920: { answers: ['AI', 'สร้างสรรค์', 'สนุก'], emojis: ['สนุกสนาน', 'รัก'] },
      } as const;
      const sample = sampleByWidth[width as keyof typeof sampleByWidth];
      await page.getByLabel('คำที่ 1').fill(sample.answers[0]);
      await page.getByLabel('คำที่ 2').fill(sample.answers[1]);
      await page.getByLabel('คำที่ 3').fill(sample.answers[2]);
      await page.getByRole('button', { name: sample.emojis[0] }).click();
      await page.getByRole('button', { name: sample.emojis[1] }).click();
      await page.getByRole('button', { name: 'ส่งคำตอบ' }).click();

      // Trigger secret access
      const logo = page.getByTestId('brand-logo');
      for (let i = 0; i < 5; i++) {
        await logo.click();
      }

      await page.getByLabel('กรอกรหัสผ่าน (PIN)').fill('123456');
      await page.getByRole('button', { name: 'ยืนยัน' }).click();
      await page.waitForURL('/presenter');

      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({ path: `e2e/screenshots/presenter-${width}.png` });
    });
  }

  test('Presenter controls stay on one line at width 1024', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 1080 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    const logo = page.getByTestId('brand-logo');
    for (let i = 0; i < 5; i++) await logo.click();
    await page.getByLabel('กรอกรหัสผ่าน (PIN)').fill('123456');
    await page.getByRole('button', { name: 'ยืนยัน' }).click();
    await page.waitForURL('/presenter');

    for (const name of ['ล้างผลข้อมูล', 'ออกจากระบบ']) {
      const metrics = await page.getByRole('button', { name }).evaluate((element) => {
        const style = getComputedStyle(element);
        return {
          clientWidth: element.clientWidth,
          scrollWidth: element.scrollWidth,
          whiteSpace: style.whiteSpace,
        };
      });
      expect(metrics.whiteSpace).toBe('nowrap');
      expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth);
    }
  });
});
