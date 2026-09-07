import { expect, test } from '@playwright/test';

const cachedRecipe = {
  id: 'offline-soup',
  title: 'Soupe hors ligne',
  ingredients: [{ name: 'Tomate', quantity: '4', unit: 'pièce' }],
  instructions: ['Laisser mijoter vingt minutes.'],
  isWorkInProgress: false,
  isPinned: false,
};

test('keeps the recipe catalogue and detail readable offline', async ({
  context,
  page,
}) => {
  await page.route('**/api/recipes**', (route) => route.abort());
  await page.goto('/');
  await expect(page.getByRole('alert')).toContainText('Aucune copie locale');

  await page.evaluate(async (recipe) => {
    await navigator.serviceWorker.ready;
    localStorage.setItem(
      'recipe-api-catalogue-cache',
      JSON.stringify({
        version: 1,
        savedAt: '2026-08-15T14:30:00.000Z',
        recipes: [recipe],
      }),
    );
  }, cachedRecipe);
  await page.reload();
  await expect
    .poll(() =>
      page.evaluate(() => Boolean(navigator.serviceWorker.controller)),
    )
    .toBe(true);

  await expect(page.getByRole('status')).toContainText('Mode hors ligne');
  await expect(
    page.getByRole('heading', { name: cachedRecipe.title }),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Ajouter une recette' }),
  ).toHaveCount(0);

  await context.setOffline(true);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('status')).toContainText('Mode hors ligne');

  await page
    .locator('article')
    .filter({ hasText: cachedRecipe.title })
    .getByRole('button', { name: 'Voir la recette →' })
    .click();

  await expect(page.getByRole('status')).toContainText('Mode hors ligne');
  await expect(page.getByText(cachedRecipe.instructions[0])).toBeVisible();
  await expect(page.getByRole('link', { name: 'Modifier' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Supprimer' })).toHaveCount(0);
});
