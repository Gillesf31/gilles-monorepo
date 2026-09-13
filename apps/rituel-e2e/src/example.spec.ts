import { test, expect } from '@playwright/test';

test('shows routines that need attention', async ({ page }) => {
  await page.goto('/');

  await expect(
    page.getByRole('heading', {
      name: 'Accordez du temps aux petites choses.',
    }),
  ).toBeVisible();
  await expect(page.getByText('Change the laundry')).toBeVisible();
  await expect(page.getByText('Deep clean the coffee machine')).toBeVisible();
});

test('creates a routine with a notification time and edits it from the dashboard', async ({
  page,
}) => {
  await page.goto('/tasks/new');

  await page.getByLabel('Que faut-il faire ?').fill('Water the plants');
  const firstDueDate = page.getByLabel('Première date prévue');
  const tomorrow = new Date(`${await firstDueDate.inputValue()}T12:00:00Z`);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  await firstDueDate.fill(tomorrow.toISOString().slice(0, 10));
  await page.getByLabel('À quelle fréquence ?').selectOption('weekly');
  const notificationTime = page.getByLabel('Heure du rappel');
  await expect(notificationTime).toHaveValue('08:00');
  await notificationTime.fill('19:15');
  await page.getByRole('button', { name: 'Enregistrer la routine' }).click();

  const routine = page
    .locator('article')
    .filter({ hasText: 'Water the plants' });
  await expect(routine).toBeVisible();
  await routine.getByRole('link', { name: 'Modifier' }).click();
  await expect(notificationTime).toHaveValue('19:15');
  await notificationTime.fill('07:45');
  await page
    .getByRole('button', { name: 'Enregistrer les modifications' })
    .click();
  await routine.getByRole('link', { name: 'Modifier' }).click();
  await expect(notificationTime).toHaveValue('07:45');
});
