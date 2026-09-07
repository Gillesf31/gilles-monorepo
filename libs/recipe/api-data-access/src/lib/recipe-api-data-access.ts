import { PgClient } from '@effect/sql-pg';
import {
  normalizeRecipeIngredients,
  Recipe,
} from '@gilles-monorepo/recipe-model';
import { Effect, Schema } from 'effect';

const RecipeRow = Schema.Struct({
  id: Schema.String,
  title: Schema.String,
  ingredients: Schema.Array(
    Schema.Union(
      Schema.String,
      Schema.Struct({
        name: Schema.String,
        quantity: Schema.String,
        unit: Schema.String,
      }),
    ),
  ),
  instructions: Schema.Array(Schema.String),
  is_work_in_progress: Schema.Boolean,
  is_pinned: Schema.Boolean,
});

const decodeRecipes = (rows: unknown) =>
  Schema.decodeUnknown(Schema.Array(RecipeRow))(rows).pipe(
    Effect.map((rows) =>
      rows.map(
        (row) =>
          new Recipe(
            row.id,
            row.title,
            normalizeRecipeIngredients(row.ingredients),
            [...row.instructions],
            row.is_work_in_progress,
            row.is_pinned,
          ),
      ),
    ),
  );

export class RecipeRepository extends Effect.Service<RecipeRepository>()(
  'recipe/RecipeRepository',
  {
    effect: Effect.gen(function* () {
      const sql = yield* PgClient.PgClient;
      return {
        create: (recipe: Omit<Recipe, 'id' | 'isPinned'>) =>
          sql.withTransaction(
            sql`
        INSERT INTO public.recipes ${sql.insert({
          title: recipe.title,
          ingredients: JSON.stringify(
            normalizeRecipeIngredients(recipe.ingredients),
          ),
          instructions: recipe.instructions,
          is_work_in_progress: recipe.isWorkInProgress,
        })}
        RETURNING id, title, ingredients, instructions, is_work_in_progress, is_pinned
      `.pipe(
              Effect.flatMap(decodeRecipes),
              Effect.map(([recipe]) => recipe),
            ),
          ),
        update: (id: string, recipe: Omit<Recipe, 'id' | 'isPinned'>) =>
          sql.withTransaction(
            sql`
        UPDATE public.recipes SET
          title = ${recipe.title},
          ingredients = ${JSON.stringify(normalizeRecipeIngredients(recipe.ingredients))}::jsonb,
          instructions = ${recipe.instructions},
          is_work_in_progress = ${recipe.isWorkInProgress}
        WHERE id = ${id}::uuid
        RETURNING id, title, ingredients, instructions, is_work_in_progress, is_pinned
      `.pipe(
              Effect.flatMap(decodeRecipes),
              Effect.map(([recipe]) => recipe),
            ),
          ),
        setPinned: (id: string, isPinned: boolean) =>
          sql.withTransaction(
            sql`
        UPDATE public.recipes SET is_pinned = ${isPinned}
        WHERE id = ${id}::uuid
        RETURNING id, title, ingredients, instructions, is_work_in_progress, is_pinned
      `.pipe(
              Effect.flatMap(decodeRecipes),
              Effect.map(([recipe]) => recipe),
            ),
          ),
        delete: (id: string) =>
          sql`DELETE FROM public.recipes WHERE id = ${id}::uuid RETURNING id`.pipe(
            Effect.map((rows) => rows.length > 0),
          ),
        findAll: () =>
          sql`
        SELECT id, title, ingredients, instructions, is_work_in_progress, is_pinned
        FROM public.recipes ORDER BY created_at DESC, id
      `.pipe(Effect.flatMap(decodeRecipes)),
        findById: (id: string) =>
          sql`
        SELECT id, title, ingredients, instructions, is_work_in_progress, is_pinned
        FROM public.recipes WHERE id = ${id}::uuid
      `.pipe(
            Effect.flatMap(decodeRecipes),
            Effect.map(([recipe]) => recipe),
          ),
      };
    }),
  },
) {}
