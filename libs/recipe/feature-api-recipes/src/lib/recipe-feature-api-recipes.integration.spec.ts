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
  'PostgreSQL recipe reads and creation',
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

    it('rejects invalid stored JSON without exposing it in the response', async () => {
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
    });

    it('cannot update or delete recipes or read shopping lists with the API credentials', async () => {
      const results = await Effect.runPromise(
        Effect.gen(function* () {
          const sql = yield* PgClient.PgClient;
          return yield* Effect.all([
            Effect.either(
              sql`UPDATE public.recipes SET title = 'Forbidden' WHERE id = ${id}::uuid`,
            ),
            Effect.either(
              sql`DELETE FROM public.recipes WHERE id = ${id}::uuid`,
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
