import { test, expect } from '@playwright/test';

test('shows routines that need attention', async ({ page }) => {
  await page.goto('/');

  await expect(
    page.getByRole('heading', {
      name: 'Give the small things their moment.',
    }),
  ).toBeVisible();
  await expect(page.getByText('Change the laundry')).toBeVisible();
  await expect(page.getByText('Deep clean the coffee machine')).toBeVisible();
});

test('creates a weekly routine and shows it on the dashboard', async ({
  page,
}) => {
  await page.goto('/tasks/new');

  await page.getByLabel('What needs doing?').fill('Water the plants');
  await page.getByLabel('First due date').fill('2026-07-19');
  await page.getByLabel('How often?').selectOption('weekly');
  await page.getByRole('button', { name: 'Save routine' }).click();

  await expect(
    page
      .locator('section[aria-labelledby="upcoming-title"]')
      .getByText('Water the plants'),
  ).toBeVisible();
});
