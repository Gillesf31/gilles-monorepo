import { HttpApp } from '@effect/platform';
import { PgClient } from '@effect/sql-pg';
import { RecipeRepository } from '@gilles-monorepo/recipe-api-data-access';
import { Effect, Layer, Redacted } from 'effect';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { recipesRoutes } from './recipe-feature-api-recipes';

// Opt in: this suite writes a disposable fixture to the local Compose database.
const root = resolve(import.meta.dirname, '../../../../..');
const id = randomUUID();
const admin = (query: string, fixtureId = id) =>
  execFileSync(
    'docker',
    [
      'compose',
      '-f',
      'infra/recipe/compose.yaml',
      'exec',
      '-T',
      'postgres',
      'sh',
      '-c',
      'psql -X -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 -v fixture_id="$1"',
      'sh',
      fixtureId,
    ],
    { cwd: root, input: query, stdio: ['pipe', 'pipe', 'pipe'] },
  );

describe.runIf(process.env['RECIPE_DB_INTEGRATION'] === '1')(
  'PostgreSQL recipe lifecycle',
  () => {
    let web: ReturnType<typeof HttpApp.toWebHandlerLayer>;
    let fixtureCreated = false;
    let createdId: string | undefined;

    beforeAll(() => {
      if (!process.env['DATABASE_URL'])
        process.loadEnvFile(resolve(root, 'apps/recipe-api/.env'));
      const url = new URL(process.env['DATABASE_URL'] ?? '');
      if (
        !['127.0.0.1', 'localhost'].includes(url.hostname) ||
        url.username !== 'recipe_api'
      ) {
        throw new Error(
          'Integration tests require the local recipe_api database role',
        );
      }
      admin(`INSERT INTO public.recipes (id, title, ingredients, instructions, is_work_in_progress, is_pinned)
      VALUES (:'fixture_id', 'Database omelette',
      '[" salt ", {"name":" eggs ","quantity":"2","unit":""}]',
      ARRAY['Mix', 'Cook'], true, true);`);
      fixtureCreated = true;
      web = HttpApp.toWebHandlerLayer(
        recipesRoutes,
        RecipeRepository.Default.pipe(
          Layer.provide(
            PgClient.layer({
              url: Redacted.make(url.toString()),
              connectTimeout: '2 seconds',
            }),
          ),
        ),
      );
    });

    afterAll(async () => {
      try {
        await web?.dispose();
      } finally {
        if (createdId)
          admin(
            "DELETE FROM public.recipes WHERE id = :'fixture_id';",
            createdId,
          );
        if (fixtureCreated)
          admin("DELETE FROM public.recipes WHERE id = :'fixture_id';");
      }
    });

    it('creates through the restricted role and returns the same recipe from both GET routes', async () => {
      const input = {
        title: "  Chef's omelette  ",
        ingredients: [{ name: ' eggs ', quantity: ' 2 ', unit: '' }],
        instructions: ['Mix "carefully", then fold.\\Rest.'],
        isWorkInProgress: true,
      };
      const response = await web.handler(
        new Request('http://localhost/recipes', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(input),
        }),
      );
      expect(response.status).toBe(201);
      const recipe = await response.json();
      createdId = recipe.id;
      expect(recipe.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
      expect(recipe).toEqual({
        ...input,
        id: createdId,
        title: "Chef's omelette",
        ingredients: [{ name: 'eggs', quantity: '2', unit: '' }],
        isPinned: false,
      });
      expect(response.headers.get('location')).toBe(`/recipes/${createdId}`);
      const detail = await web.handler(
        new Request(`http://localhost/recipes/${createdId}`),
      );
      expect(detail.status).toBe(200);
      expect(await detail.json()).toEqual(recipe);
      const list = await web.handler(new Request('http://localhost/recipes'));
      expect(list.status).toBe(200);
      expect(await list.json()).toContainEqual(recipe);
    });

    it('returns database values and normalizes both legacy and structured ingredients', async () => {
      const response = await web.handler(
        new Request(`http://localhost/recipes/${id}`),
      );
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({
        id,
        title: 'Database omelette',
        ingredients: [
          { name: 'salt', quantity: '', unit: '' },
          { name: 'eggs', quantity: '2', unit: '' },
        ],
        instructions: ['Mix', 'Cook'],
        isWorkInProgress: true,
        isPinned: true,
      });
    });

    it('opens a persisted recipe returned by the collection using the same ID', async () => {
      const listResponse = await web.handler(
        new Request('http://localhost/recipes'),
      );
      expect(listResponse.status).toBe(200);
      const recipes = await listResponse.json();
      const listedRecipe = recipes.find(
        (recipe: { id: string }) => recipe.id === id,
      );
      expect(listedRecipe).toBeDefined();
      const detailResponse = await web.handler(
        new Request(`http://localhost/recipes/${listedRecipe.id}`),
      );
      expect(detailResponse.status).toBe(200);
      expect(await detailResponse.json()).toEqual(listedRecipe);
    });

    it('returns 404 for a UUID absent from PostgreSQL', async () => {
      const response = await web.handler(
        new Request(`http://localhost/recipes/${randomUUID()}`),
      );
      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({ message: 'Recipe not found' });
    });

    it('pins and unpins idempotently without changing content, timestamps or other recipes', async () => {
      if (!createdId) throw new Error('Creation test must succeed first');
      const unchangedFields = () =>
        admin(
          "SELECT id, title, ingredients, instructions, created_at, is_work_in_progress FROM public.recipes WHERE id = :'fixture_id';",
          createdId,
        ).toString();
      const before = unchangedFields();
      const detail = () =>
        web.handler(new Request(`http://localhost/recipes/${createdId}`));
      const original = await (await detail()).json();
      const otherRecipe = admin(
        "SELECT * FROM public.recipes WHERE id = :'fixture_id';",
      ).toString();
      const pin = (body: unknown, recipeId = createdId) =>
        web.handler(
          new Request(`http://localhost/recipes/${recipeId}/pin`, {
            method: 'PATCH',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(body),
          }),
        );
      for (const isPinned of [true, true, false, false]) {
        const response = await pin({ isPinned });
        expect(response.status).toBe(200);
        const expected = { ...original, isPinned };
        expect(await response.json()).toEqual(expected);
        expect(await (await detail()).json()).toEqual(expected);
        const list = await web.handler(new Request('http://localhost/recipes'));
        expect(await list.json()).toContainEqual(expected);
        expect(unchangedFields()).toBe(before);
      }
      expect((await pin({ isPinned: true, title: 'Overwrite' })).status).toBe(
        400,
      );
      expect(await (await detail()).json()).toEqual(original);
      expect(
        admin(
          "SELECT * FROM public.recipes WHERE id = :'fixture_id';",
        ).toString(),
      ).toBe(otherRecipe);
      const missingId = randomUUID();
      expect((await pin({ isPinned: true }, missingId)).status).toBe(404);
      expect(
        (
          await web.handler(
            new Request(`http://localhost/recipes/${missingId}`),
          )
        ).status,
      ).toBe(404);
    });

    it('updates, preserves protected fields, rejects invalid writes, and deletes only the requested recipe', async () => {
      if (!createdId) throw new Error('Creation test must succeed first');
      admin(
        "UPDATE public.recipes SET is_pinned = true WHERE id = :'fixture_id';",
        createdId,
      );
      const protectedFields = () =>
        admin(
          "SELECT id, created_at, is_pinned FROM public.recipes WHERE id = :'fixture_id';",
          createdId,
        ).toString();
      const before = protectedFields();
      const input = {
        title: "  Chef's updated omelette  ",
        ingredients: [{ name: ' cheese ', quantity: ' 50 ', unit: ' g ' }],
        instructions: [' Fold "gently", then rest.\\Serve. '],
      };
      const put = (body: unknown, recipeId = createdId) =>
        web.handler(
          new Request(`http://localhost/recipes/${recipeId}`, {
            method: 'PUT',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(body),
          }),
        );
      const response = await put(input);
      expect(response.status).toBe(200);
      const updated = await response.json();
      expect(updated).toEqual({
        id: createdId,
        title: "Chef's updated omelette",
        ingredients: [{ name: 'cheese', quantity: '50', unit: 'g' }],
        instructions: ['Fold "gently", then rest.\\Serve.'],
        isWorkInProgress: false,
        isPinned: true,
      });
      expect(protectedFields()).toBe(before);
      for (const invalid of [
        { title: 'Partial update' },
        { ...input, isPinned: false },
        { ...input, ingredients: [] },
      ]) {
        expect((await put(invalid)).status).toBe(400);
      }
      const detail = await web.handler(
        new Request(`http://localhost/recipes/${createdId}`),
      );
      expect(await detail.json()).toEqual(updated);
      const list = await web.handler(new Request('http://localhost/recipes'));
      expect(await list.json()).toContainEqual(updated);
      const missingId = randomUUID();
      expect((await put(input, missingId)).status).toBe(404);
      expect(
        (
          await web.handler(
            new Request(`http://localhost/recipes/${missingId}`),
          )
        ).status,
      ).toBe(404);

      const draft = await put({
        ...input,
        instructions: [],
        isWorkInProgress: true,
      });
      expect(draft.status).toBe(200);
      expect(await draft.json()).toMatchObject({
        instructions: [],
        isWorkInProgress: true,
        isPinned: true,
      });
      const remove = () =>
        web.handler(
          new Request(`http://localhost/recipes/${createdId}`, {
            method: 'DELETE',
          }),
        );
      const deleted = await remove();
      expect(deleted.status).toBe(204);
      expect(await deleted.text()).toBe('');
      expect((await remove()).status).toBe(404);
      expect(
        (
          await web.handler(
            new Request(`http://localhost/recipes/${createdId}`),
          )
        ).status,
      ).toBe(404);
      const remaining = await web.handler(
        new Request('http://localhost/recipes'),
      );
      const recipes = await remaining.json();
      expect(
        recipes.some((recipe: { id: string }) => recipe.id === createdId),
      ).toBe(false);
      expect(recipes.some((recipe: { id: string }) => recipe.id === id)).toBe(
        true,
      );
    });

    it('rejects invalid stored JSON and rolls back a pin change if response decoding fails', async () => {
      admin(
        "UPDATE public.recipes SET ingredients = '[42]' WHERE id = :'fixture_id';",
      );
      const response = await web.handler(
        new Request(`http://localhost/recipes/${id}`),
      );
      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({
        message: 'Unable to load recipe',
      });
      const pinBefore = admin(
        "SELECT is_pinned FROM public.recipes WHERE id = :'fixture_id';",
      ).toString();
      const pinResponse = await web.handler(
        new Request(`http://localhost/recipes/${id}/pin`, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ isPinned: false }),
        }),
      );
      expect(pinResponse.status).toBe(500);
      expect(await pinResponse.json()).toEqual({
        message: 'Unable to load recipe',
      });
      expect(
        admin(
          "SELECT is_pinned FROM public.recipes WHERE id = :'fixture_id';",
        ).toString(),
      ).toBe(pinBefore);
    });

    it('cannot update protected fields or read shopping lists with the API credentials', async () => {
      const results = await Effect.runPromise(
        Effect.gen(function* () {
          const sql = yield* PgClient.PgClient;
          return yield* Effect.all([
            Effect.either(
              sql`UPDATE public.recipes SET id = ${randomUUID()}::uuid WHERE id = ${id}::uuid`,
            ),
            Effect.either(
              sql`UPDATE public.recipes SET created_at = now() WHERE id = ${id}::uuid`,
            ),
            Effect.either(sql`SELECT * FROM public.shopping_lists`),
          ]);
        }).pipe(
          Effect.provide(
            PgClient.layer({
              url: Redacted.make(process.env['DATABASE_URL'] ?? ''),
              connectTimeout: '2 seconds',
            }),
          ),
        ),
      );
      for (const result of results) {
        expect(result).toMatchObject({
          _tag: 'Left',
          left: { cause: { code: '42501' } },
        });
      }
    });
  },
);
