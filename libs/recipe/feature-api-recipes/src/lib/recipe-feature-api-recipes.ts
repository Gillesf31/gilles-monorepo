import {
  HttpRouter,
  HttpServerRequest,
  HttpServerResponse,
} from '@effect/platform';
import { RecipeRepository } from '@gilles-monorepo/recipe-api-data-access';
import { Effect, Schema } from 'effect';

const NonBlankText = Schema.Trim.pipe(Schema.minLength(1));
const RecipeBody = Schema.Struct({
  title: NonBlankText,
  ingredients: Schema.mutable(
    Schema.Array(
      Schema.Struct({
        name: NonBlankText,
        quantity: Schema.Trim,
        unit: Schema.Trim,
      }),
    ).pipe(Schema.minItems(1)),
  ),
  instructions: Schema.mutable(Schema.Array(NonBlankText)),
  isWorkInProgress: Schema.optionalWith(Schema.Boolean, {
    default: () => false,
  }),
});

const isRecipeId = (id: string | undefined): id is string =>
  !!id &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
const recipeNotFound = () =>
  HttpServerResponse.json({ message: 'Recipe not found' }, { status: 404 });

export const recipesRoutes = HttpRouter.empty.pipe(
  HttpRouter.post(
    '/recipes',
    Effect.gen(function* () {
      const body = yield* HttpServerRequest.schemaBodyJson(RecipeBody, {
        onExcessProperty: 'error',
      }).pipe(Effect.either);
      if (body._tag === 'Left') {
        return yield* HttpServerResponse.json(
          { message: 'Invalid recipe' },
          { status: 400 },
        );
      }
      const repository = yield* RecipeRepository;
      const recipe = yield* repository.create(body.right);
      return yield* HttpServerResponse.json(recipe, {
        status: 201,
        headers: { location: `/recipes/${recipe.id}` },
      });
    }),
  ),
  HttpRouter.put(
    '/recipes/:id',
    Effect.gen(function* () {
      const { id } = yield* HttpRouter.params;
      if (!isRecipeId(id)) return yield* recipeNotFound();
      const body = yield* HttpServerRequest.schemaBodyJson(RecipeBody, {
        onExcessProperty: 'error',
      }).pipe(Effect.either);
      if (body._tag === 'Left') {
        return yield* HttpServerResponse.json(
          { message: 'Invalid recipe' },
          { status: 400 },
        );
      }
      const repository = yield* RecipeRepository;
      const recipe = yield* repository.update(id, body.right);
      return yield* recipe ? HttpServerResponse.json(recipe) : recipeNotFound();
    }),
  ),
  HttpRouter.del(
    '/recipes/:id',
    Effect.gen(function* () {
      const { id } = yield* HttpRouter.params;
      if (!isRecipeId(id)) return yield* recipeNotFound();
      const repository = yield* RecipeRepository;
      const deleted = yield* repository.delete(id);
      return yield* deleted
        ? HttpServerResponse.empty({ status: 204 })
        : recipeNotFound();
    }),
  ),
  HttpRouter.get(
    '/recipes',
    Effect.gen(function* () {
      const reader = yield* RecipeRepository;
      return yield* HttpServerResponse.json(yield* reader.findAll());
    }),
  ),
  HttpRouter.get(
    '/recipes/:id',
    Effect.gen(function* () {
      const { id } = yield* HttpRouter.params;
      if (!isRecipeId(id)) return yield* recipeNotFound();
      const reader = yield* RecipeRepository;
      const recipe = yield* reader.findById(id);
      return yield* recipe ? HttpServerResponse.json(recipe) : recipeNotFound();
    }),
  ),
  HttpRouter.catchTag('SqlError', () =>
    HttpServerResponse.json(
      { message: 'Recipe storage unavailable' },
      { status: 503 },
    ),
  ),
  HttpRouter.catchTag('ParseError', () =>
    HttpServerResponse.json(
      { message: 'Unable to load recipe' },
      { status: 500 },
    ),
  ),
);
