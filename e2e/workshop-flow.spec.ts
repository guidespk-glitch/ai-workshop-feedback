import { test, expect } from '@playwright/test';

test.describe('Workshop Feedback Flow', () => {
  test('reproduces full participant-to-presenter flow', async ({ page, context }) => {
    test.slow();
    // 1. Visit participant page
    await page.goto('/');
    await expect(page).toHaveTitle(/แบบสอบถามความรู้สึกหลังการอบรม/);

    // Verify submit button is disabled initially
    const submitBtn = page.getByRole('button', { name: 'ส่งคำตอบ' });
    await expect(submitBtn).toBeDisabled();

    // 2. Fill Question 1 answers
    await page.getByLabel('คำที่ 1').fill('AI');
    await page.getByLabel('คำที่ 2').fill('สร้างสรรค์');
    await page.getByLabel('คำที่ 3').fill('นำไปใช้');

    // Select emotions
    const loveEmoji = page.getByRole('button', { name: /รัก/ });
    const wowEmoji = page.getByRole('button', { name: /ว้าว/ });

    await loveEmoji.click();
    await expect(submitBtn).toBeDisabled(); // Only 1 emoji selected

    await wowEmoji.click();
    await expect(submitBtn).toBeEnabled(); // 2 emojis selected, form is valid

    // 3. Submit form
    await submitBtn.click();

    // Verify thank you message
    await expect(page.getByText('ส่งคำตอบเรียบร้อยแล้ว!')).toBeVisible();

    // 4. Test hidden presenter entry
    const logo = page.getByTestId('brand-logo');
    for (let i = 0; i < 5; i++) {
      await logo.click();
    }

    // Modal should be visible
    await expect(page.getByText('เข้าสู่ระบบผู้นำเสนอ')).toBeVisible();

    // Try wrong PIN
    await page.getByLabel('กรอกรหัสผ่าน (PIN)').fill('654321');
    await page.getByRole('button', { name: 'ยืนยัน' }).click();
    await expect(page.getByText('รหัสผ่าน (PIN) ไม่ถูกต้อง')).toBeVisible();

    // Enter correct PIN (123456)
    await page.getByLabel('กรอกรหัสผ่าน (PIN)').fill('123456');
    await page.getByRole('button', { name: 'ยืนยัน' }).click();

    // Should redirect to /presenter
    await page.waitForURL('/presenter');
    await expect(page).toHaveTitle(/หน้าจอผู้นำเสนอ/);

    // 5. Presenter visualization check
    // Word cloud card should contain "AI"
    await expect(page.getByTestId('word-cloud').getByText('AI')).toBeVisible();
    await expect(page.getByTestId('word-cloud').getByText('สร้างสรรค์')).toBeVisible();

    // Emoji results card should show "รัก 3 คน" and "ว้าว 3 คน" due to cumulative submissions from previous visual tests
    await expect(page.getByLabel('รัก 3 คน')).toBeVisible();
    await expect(page.getByLabel('ว้าว 3 คน')).toBeVisible();
  });
});
