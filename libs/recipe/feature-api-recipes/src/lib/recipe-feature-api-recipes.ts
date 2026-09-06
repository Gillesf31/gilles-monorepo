import { HttpRouter, HttpServerResponse } from '@effect/platform';
import type { Recipe } from '@gilles-monorepo/recipe-model';

// ponytail: fixed sample only; load persisted recipes when storage is added.
const recipes = [
  {
    id: '1',
    title: 'Scrambled eggs',
    ingredients: [{ name: 'eggs', quantity: '2', unit: '' }],
    instructions: ['Beat the eggs.', 'Cook gently in a pan, stirring.'],
    isWorkInProgress: false,
    isPinned: false,
  },
] satisfies Recipe[];

export const recipesRoutes = HttpRouter.empty.pipe(
  HttpRouter.get('/recipes', HttpServerResponse.json(recipes)),
);
