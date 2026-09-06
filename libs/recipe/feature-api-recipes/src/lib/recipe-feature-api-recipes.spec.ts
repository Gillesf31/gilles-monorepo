import { HttpApp } from '@effect/platform';
import { expect, it } from 'vitest';
import { recipesRoutes } from './recipe-feature-api-recipes';

const sampleRecipe = {
  id: '1',
  title: 'Scrambled eggs',
  ingredients: [{ name: 'eggs', quantity: '2', unit: '' }],
  instructions: ['Beat the eggs.', 'Cook gently in a pan, stirring.'],
  isWorkInProgress: false,
  isPinned: false,
};

it('returns the sample recipe as JSON for GET /recipes', async () => {
  const handler = HttpApp.toWebHandler(recipesRoutes);
  const response = await handler(new Request('http://localhost/recipes'));

  expect(response.status).toBe(200);
  expect(response.headers.get('content-type')).toBe('application/json');
  expect(await response.json()).toEqual([sampleRecipe]);
});

it('returns the recipe as JSON for a known ID', async () => {
  const handler = HttpApp.toWebHandler(recipesRoutes);
  const response = await handler(new Request('http://localhost/recipes/1'));

  expect(response.status).toBe(200);
  expect(response.headers.get('content-type')).toBe('application/json');
  expect(await response.json()).toEqual(sampleRecipe);
});

it('returns a JSON error for an unknown recipe ID', async () => {
  const handler = HttpApp.toWebHandler(recipesRoutes);
  const response = await handler(
    new Request('http://localhost/recipes/unknown'),
  );

  expect(response.status).toBe(404);
  expect(response.headers.get('content-type')).toBe('application/json');
  expect(await response.json()).toEqual({ message: 'Recipe not found' });
});
