import { expect, test as base } from '@playwright/test';

// Every recipe created by these tests is tracked and cleaned up in PostgreSQL.
const test = base.extend<{ recipeIds: string[] }>({
  recipeIds: async ({ request }, use) => {
    const ids: string[] = [];
    await use(ids);
    for (const id of ids) {
      const response = await request.delete(`/api/recipes/${id}`);
      expect([204, 404]).toContain(response.status());
    }
  },
});

test('supports the core recipe workflow', async ({
  browserName,
  page,
  recipeIds,
}) => {
  const recipeTitle = `Tarte citron e2e ${browserName} ${Date.now()}`;
  const updatedRecipeTitle = `Tarte citron meringuée e2e ${browserName}`;

  await page.goto('/');

  await expect(
    page.getByRole('heading', { name: 'Mes recettes' }),
  ).toBeVisible();

  await page.getByRole('link', { name: 'Ajouter une recette' }).click();

  await page.getByLabel('Titre').fill(recipeTitle);
  await page.getByLabel('Quantité').fill('2');
  await page.getByLabel('Unité').selectOption('pièce');
  await page.getByRole('textbox', { name: 'Ingrédient' }).fill('Citrons');
  await page.getByLabel('Étape 1').fill('Presser les citrons.');
  const creation = page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' &&
      response.url().endsWith('/api/recipes'),
  );
  await page.getByRole('button', { name: 'Enregistrer la recette' }).click();
  const created = await creation;
  expect(created.status()).toBe(201);
  recipeIds.push((await created.json()).id);

  await page
    .getByPlaceholder('Rechercher par titre ou ingrédient…')
    .fill(recipeTitle);

  const createdRecipeCard = page
    .locator('article')
    .filter({ hasText: recipeTitle });
  await expect(createdRecipeCard).toBeVisible();
  await createdRecipeCard
    .getByRole('button', { name: 'Épingler la recette', exact: true })
    .click();
  await expect(
    createdRecipeCard.getByRole('button', {
      name: 'Désépingler la recette',
      exact: true,
    }),
  ).toBeVisible();
  await page.reload();
  await expect(
    createdRecipeCard.getByRole('button', {
      name: 'Désépingler la recette',
      exact: true,
    }),
  ).toBeVisible();
  await createdRecipeCard
    .getByRole('button', { name: 'Désépingler la recette', exact: true })
    .click();
  await expect(
    createdRecipeCard.getByRole('button', {
      name: 'Épingler la recette',
      exact: true,
    }),
  ).toBeVisible();

  await createdRecipeCard
    .getByRole('button', { name: 'Voir la recette →' })
    .click();
  await expect(page.getByRole('heading', { name: recipeTitle })).toBeVisible();
  await expect(page.getByText('Presser les citrons.')).toBeVisible();

  await page.getByRole('link', { name: 'Modifier' }).click();
  await page.getByLabel('Titre').fill(updatedRecipeTitle);
  await page
    .getByLabel('Étape 1')
    .fill('Presser les citrons puis garnir la pâte.');
  await page
    .getByRole('button', { name: 'Enregistrer les modifications' })
    .click();

  await expect(
    page.getByRole('heading', { name: updatedRecipeTitle }),
  ).toBeVisible();
  await expect(
    page.getByText('Presser les citrons puis garnir la pâte.'),
  ).toBeVisible();

  await page.getByRole('button', { name: 'Supprimer' }).click();
  await expect(page.getByText('Supprimer la recette')).toBeVisible();
  await page.getByRole('button', { name: 'Supprimer' }).last().click();

  await expect(
    page.getByRole('heading', { name: 'Mes recettes' }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: updatedRecipeTitle }),
  ).toBeHidden();
});

test('scales measured ingredient quantities with the multiplier controls', async ({
  browserName,
  page,
  recipeIds,
}) => {
  const recipeTitle = `Multiplier e2e ${browserName} ${Date.now()}`;

  await page.goto('/');
  await page.getByRole('link', { name: 'Ajouter une recette' }).click();

  await page.getByLabel('Titre').fill(recipeTitle);
  await page.getByLabel('Quantité').fill('2');
  await page.getByLabel('Unité').selectOption('g');
  await page.getByRole('textbox', { name: 'Ingrédient' }).fill('Levure');
  await page.getByLabel('Étape 1').fill('Mélanger.');
  const creation = page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' &&
      response.url().endsWith('/api/recipes'),
  );
  await page.getByRole('button', { name: 'Enregistrer la recette' }).click();
  const created = await creation;
  expect(created.status()).toBe(201);
  recipeIds.push((await created.json()).id);

  const createdRecipeCard = page
    .locator('article')
    .filter({ hasText: recipeTitle });
  await expect(createdRecipeCard).toBeVisible();
  await createdRecipeCard
    .getByRole('button', { name: 'Voir la recette →' })
    .click();

  await expect(
    page.getByRole('checkbox', { name: '2 g Levure' }),
  ).toBeVisible();

  await page.getByRole('button', { name: 'x2' }).click();
  await expect(
    page.getByRole('checkbox', { name: '4 g Levure' }),
  ).toBeVisible();

  const multiplierInput = page.getByRole('spinbutton', {
    name: 'Multiplicateur',
  });
  await multiplierInput.fill('1.5');
  await multiplierInput.blur();
  await expect(
    page.getByRole('checkbox', { name: '3 g Levure' }),
  ).toBeVisible();

  await page.getByRole('button', { name: 'x3' }).click();
  await expect(
    page.getByRole('checkbox', { name: '6 g Levure' }),
  ).toBeVisible();
});

test('persists the shopping list across a page reload', async ({
  page,
  request,
  recipeIds,
  browserName,
}) => {
  const recipeTitle = `Shopping pasta ${browserName} ${Date.now()}`;
  const created = await request.post('/api/recipes', {
    data: {
      title: recipeTitle,
      ingredients: [{ name: 'spaghetti', quantity: '200', unit: 'g' }],
      instructions: ['Cook.'],
      isWorkInProgress: false,
    },
  });
  expect(created.status()).toBe(201);
  recipeIds.push((await created.json()).id);
  await page.goto('/');
  await page.evaluate(() =>
    localStorage.removeItem('recipe-shopping-list-state'),
  );
  await page.goto('/courses');

  await page.getByPlaceholder('Qté').fill('2');
  await page.getByPlaceholder('Unité').fill('kg');
  await page.getByPlaceholder('Article').fill('farine e2e');
  await page.getByRole('button', { name: 'Ajouter' }).click();

  await page
    .getByRole('checkbox', {
      name: `${recipeTitle} 1 ingrédients`,
      exact: true,
    })
    .click();
  const multiplierInput = page
    .getByRole('button', {
      name: `Réduire la quantité pour ${recipeTitle}`,
      exact: true,
    })
    .locator('..')
    .getByRole('spinbutton');
  await multiplierInput.fill('2');
  await multiplierInput.blur();

  await expect(
    page.getByRole('checkbox', { name: `400 g spaghetti ${recipeTitle}` }),
  ).toBeVisible();
  await page
    .getByRole('checkbox', { name: `400 g spaghetti ${recipeTitle}` })
    .check();

  await page.reload();

  await expect(page.getByText('2 kg farine e2e')).toBeVisible();
  await expect(
    page.getByRole('checkbox', {
      name: `${recipeTitle} 1 ingrédients`,
      exact: true,
    }),
  ).toBeChecked();
  await expect(multiplierInput).toHaveValue('2');
  await expect(
    page.getByRole('checkbox', { name: `400 g spaghetti ${recipeTitle}` }),
  ).toBeChecked();
});
