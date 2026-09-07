import { HttpApp } from '@effect/platform';
import { SqlError } from '@effect/sql/SqlError';
import { RecipeRepository } from '@gilles-monorepo/recipe-api-data-access';
import { Effect } from 'effect';
import { beforeEach, expect, it, vi } from 'vitest';
import { recipesRoutes } from './recipe-feature-api-recipes';

const sampleRecipe = {
  id: '63d96021-6aad-401f-87f5-2d055ffdb512',
  title: 'Scrambled eggs',
  ingredients: [{ name: 'eggs', quantity: '2', unit: '' }],
  instructions: ['Beat the eggs.', 'Cook gently in a pan, stirring.'],
  isWorkInProgress: false,
  isPinned: false,
};
const id = '63d96021-6aad-401f-87f5-2d055ffdb512';
const findById = vi.fn<RecipeRepository['findById']>();
const findAll = vi.fn<RecipeRepository['findAll']>();
const create = vi.fn<RecipeRepository['create']>();
const update = vi.fn<RecipeRepository['update']>();
const deleteRecipe = vi.fn<RecipeRepository['delete']>();
const handler = HttpApp.toWebHandler(
  recipesRoutes.pipe(
    Effect.provideService(
      RecipeRepository,
      RecipeRepository.make({
        findById,
        findAll,
        create,
        update,
        delete: deleteRecipe,
      }),
    ),
  ),
);
beforeEach(() => {
  update.mockReset().mockReturnValue(Effect.succeed(sampleRecipe));
  deleteRecipe.mockReset().mockReturnValue(Effect.succeed(true));
  create.mockReset().mockReturnValue(Effect.succeed(sampleRecipe));
  findAll.mockReset().mockReturnValue(Effect.succeed([]));
  findById.mockReset().mockReturnValue(Effect.succeed(undefined));
});

const newRecipe = {
  title: 'Scrambled eggs',
  ingredients: [{ name: 'eggs', quantity: '2', unit: '' }],
  instructions: ['Beat the eggs.', 'Cook gently in a pan, stirring.'],
};
const postRecipe = (body: unknown) =>
  handler(
    new Request('http://localhost/recipes', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }),
  );

const putRecipe = (body: unknown, recipeId = id) =>
  handler(
    new Request(`http://localhost/recipes/${recipeId}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }),
  );
const removeRecipe = (recipeId = id) =>
  handler(
    new Request(`http://localhost/recipes/${recipeId}`, { method: 'DELETE' }),
  );

it('creates a recipe with normalized input, defaults and a detail Location', async () => {
  const response = await postRecipe({
    ...newRecipe,
    title: '  Scrambled eggs  ',
  });
  expect(response.status).toBe(201);
  expect(response.headers.get('location')).toBe(`/recipes/${id}`);
  expect(await response.json()).toEqual(sampleRecipe);
  expect(create).toHaveBeenCalledExactlyOnceWith({
    ...newRecipe,
    isWorkInProgress: false,
  });
});

it('allows a work-in-progress recipe without instructions', async () => {
  const input = { ...newRecipe, instructions: [], isWorkInProgress: true };
  expect((await postRecipe(input)).status).toBe(201);
  expect(create).toHaveBeenCalledExactlyOnceWith(input);
});

it.each([
  null,
  {},
  { ...newRecipe, title: '  ' },
  { ...newRecipe, ingredients: [] },
  { ...newRecipe, ingredients: ['eggs'] },
  { ...newRecipe, ingredients: [{ name: ' ', quantity: '2', unit: '' }] },
  { ...newRecipe, ingredients: [{ name: 'eggs', quantity: 2, unit: '' }] },
  { ...newRecipe, instructions: 'Mix' },
  { ...newRecipe, instructions: [' '] },
  { ...newRecipe, isWorkInProgress: 'true' },
  { ...newRecipe, id },
  { ...newRecipe, isPinned: true },
  { ...newRecipe, createdAt: '2026-01-01' },
])('rejects invalid input without writing: %j', async (input) => {
  for (const send of [postRecipe, putRecipe]) {
    const response = await send(input);
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ message: 'Invalid recipe' });
  }
  expect(create).not.toHaveBeenCalled();
  expect(update).not.toHaveBeenCalled();
});

it.each(['POST', 'PUT'])(
  'rejects malformed JSON without writing for %s',
  async (method) => {
    const response = await handler(
      new Request(
        `http://localhost/recipes${method === 'PUT' ? '/' + id : ''}`,
        {
          method,
          headers: { 'content-type': 'application/json' },
          body: '{',
        },
      ),
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ message: 'Invalid recipe' });
    expect(create).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  },
);

it('returns a sanitized 503 when creation fails', async () => {
  create.mockReturnValue(
    Effect.fail(new SqlError({ message: 'private database detail' })),
  );
  const response = await postRecipe(newRecipe);
  expect(response.status).toBe(503);
  expect(await response.json()).toEqual({
    message: 'Recipe storage unavailable',
  });
});

it('returns the collection from storage', async () => {
  findAll.mockReturnValue(Effect.succeed([sampleRecipe]));
  const response = await handler(new Request('http://localhost/recipes'));
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual([sampleRecipe]);
  expect(findAll).toHaveBeenCalledOnce();
  expect(findById).not.toHaveBeenCalled();
});

it('returns the persisted recipe from the reader', async () => {
  const recipe = { ...sampleRecipe, id, title: 'Persisted omelette' };
  findById.mockReturnValue(Effect.succeed(recipe));
  const response = await handler(new Request(`http://localhost/recipes/${id}`));
  expect(response.status).toBe(200);
  expect(response.headers.get('content-type')).toBe('application/json');
  expect(await response.json()).toEqual(recipe);
  expect(findById).toHaveBeenCalledWith(id);
});

it('returns 404 for a missing UUID', async () => {
  const response = await handler(new Request(`http://localhost/recipes/${id}`));
  expect(response.status).toBe(404);
  expect(await response.json()).toEqual({ message: 'Recipe not found' });
});

it.each(['unknown', '1', "' OR true --"])(
  'returns 404 without querying storage for malformed ID %s',
  async (invalidId) => {
    const response = await handler(
      new Request(`http://localhost/recipes/${encodeURIComponent(invalidId)}`),
    );
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ message: 'Recipe not found' });
    expect(findById).not.toHaveBeenCalled();
  },
);

it('returns a sanitized 503 when storage fails instead of reporting a missing recipe', async () => {
  findById.mockReturnValue(
    Effect.fail(new SqlError({ message: 'private database detail' })),
  );
  const response = await handler(new Request(`http://localhost/recipes/${id}`));
  expect(response.status).toBe(503);
  expect(await response.json()).toEqual({
    message: 'Recipe storage unavailable',
  });
});

it('returns an empty array when storage has no recipes', async () => {
  const response = await handler(new Request('http://localhost/recipes'));
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual([]);
});

it('returns a sanitized 503 when the collection query fails', async () => {
  findAll.mockReturnValue(
    Effect.fail(new SqlError({ message: 'private database detail' })),
  );
  const response = await handler(new Request('http://localhost/recipes'));
  expect(response.status).toBe(503);
  expect(await response.json()).toEqual({
    message: 'Recipe storage unavailable',
  });
});

it('replaces recipe content with normalized input and the default draft flag', async () => {
  const response = await putRecipe({
    ...newRecipe,
    title: '  Scrambled eggs  ',
    ingredients: [{ name: ' eggs ', quantity: ' 2 ', unit: ' ' }],
    instructions: [' Beat the eggs. ', ' Cook gently in a pan, stirring. '],
  });
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual(sampleRecipe);
  expect(update).toHaveBeenCalledExactlyOnceWith(id, {
    ...newRecipe,
    isWorkInProgress: false,
  });
  expect(create).not.toHaveBeenCalled();
});

it('updates a draft with an empty instructions array', async () => {
  const input = { ...newRecipe, instructions: [], isWorkInProgress: true };
  expect((await putRecipe(input)).status).toBe(200);
  expect(update).toHaveBeenCalledExactlyOnceWith(id, input);
});

it('returns 404 instead of creating a missing recipe on PUT', async () => {
  update.mockReturnValue(Effect.succeed(undefined));
  const response = await putRecipe(newRecipe);
  expect(response.status).toBe(404);
  expect(await response.json()).toEqual({ message: 'Recipe not found' });
  expect(create).not.toHaveBeenCalled();
});

it('returns an empty 204 after deletion', async () => {
  const response = await removeRecipe();
  expect(response.status).toBe(204);
  expect(await response.text()).toBe('');
  expect(deleteRecipe).toHaveBeenCalledExactlyOnceWith(id);
});

it('returns 404 when deleting a missing recipe', async () => {
  deleteRecipe.mockReturnValue(Effect.succeed(false));
  const response = await removeRecipe();
  expect(response.status).toBe(404);
  expect(await response.json()).toEqual({ message: 'Recipe not found' });
});

it.each(['unknown', '1', "' OR true --"])(
  'rejects malformed update and delete ID %s without querying storage',
  async (invalidId) => {
    for (const response of [
      await putRecipe(newRecipe, encodeURIComponent(invalidId)),
      await removeRecipe(encodeURIComponent(invalidId)),
    ]) {
      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({ message: 'Recipe not found' });
    }
    expect(update).not.toHaveBeenCalled();
    expect(deleteRecipe).not.toHaveBeenCalled();
  },
);

it('sanitizes database failures for updates and deletes', async () => {
  const failure = Effect.fail(
    new SqlError({ message: 'private database detail' }),
  );
  update.mockReturnValue(failure);
  deleteRecipe.mockReturnValue(failure);
  for (const response of [await putRecipe(newRecipe), await removeRecipe()]) {
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      message: 'Recipe storage unavailable',
    });
  }
});
