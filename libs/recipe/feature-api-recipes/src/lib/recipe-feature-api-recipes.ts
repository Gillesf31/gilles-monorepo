import { HttpRouter, HttpServerResponse } from '@effect/platform';
import type { Recipe } from '@gilles-monorepo/recipe-model';
import { Effect } from 'effect';

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
  HttpRouter.get(
    '/recipes/:id',
    Effect.flatMap(HttpRouter.params, ({ id }) => {
      const recipe = recipes.find((recipe) => recipe.id === id);
      return recipe
        ? HttpServerResponse.json(recipe)
        : HttpServerResponse.json(
            { message: 'Recipe not found' },
            { status: 404 },
          );
    }),
  ),
);
