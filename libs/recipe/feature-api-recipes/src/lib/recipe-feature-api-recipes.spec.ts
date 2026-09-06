import { HttpApp } from '@effect/platform';
import { expect, it } from 'vitest';
import { recipesRoutes } from './recipe-feature-api-recipes';

it('returns the sample recipe as JSON for GET /recipes', async () => {
  const handler = HttpApp.toWebHandler(recipesRoutes);
  const response = await handler(new Request('http://localhost/recipes'));

  expect(response.status).toBe(200);
  expect(response.headers.get('content-type')).toBe('application/json');
  expect(await response.json()).toEqual([
    {
      id: '1',
      title: 'Scrambled eggs',
      ingredients: [{ name: 'eggs', quantity: '2', unit: '' }],
      instructions: ['Beat the eggs.', 'Cook gently in a pan, stirring.'],
      isWorkInProgress: false,
      isPinned: false,
    },
  ]);
});
