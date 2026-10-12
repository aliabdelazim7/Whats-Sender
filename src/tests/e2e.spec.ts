import { test, expect } from '@playwright/test';

test.describe('Excel Messaging Assistant E2E User Journey', () => {
  test('loads application dashboard and verifies critical workflow elements', async ({ page }) => {
    await page.goto('/');

    // Check title in both Arabic or English
    const title = page.locator('h1');
    await expect(title).toBeVisible();

    // Verify key navigational buttons exist
    const composerTab = page.getByRole('button', { name: /محرر الرسائل|Message Composer/i });
    await expect(composerTab).toBeVisible();

    const contactsTab = page.getByRole('button', { name: /جهات الاتصال|Contacts/i });
    await expect(contactsTab).toBeVisible();

    // Toggle language
    const langBtn = page.getByTitle(/Toggle Language/i);
    await langBtn.click();

    // Verify English interface
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
    await expect(page.getByText('Message Composer')).toBeVisible();

    // Open Message Composer
    await page.getByRole('button', { name: 'Message Composer' }).click();
    await expect(page.getByText('Message Template Composer')).toBeVisible();
    await expect(page.getByText('Message Body')).toBeVisible();

    // Navigate to Settings
    await page.getByRole('button', { name: 'Settings' }).click();
    await expect(page.getByText('Application & Privacy Settings')).toBeVisible();
    await expect(page.getByText('Privacy & Security Guarantee')).toBeVisible();
  });
});
