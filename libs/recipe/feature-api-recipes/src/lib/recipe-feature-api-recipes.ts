import {
  HttpRouter,
  HttpServerRequest,
  HttpServerResponse,
} from '@effect/platform';
import { RecipeRepository } from '@gilles-monorepo/recipe-api-data-access';
import { Effect, Schema } from 'effect';

const NonBlankText = Schema.Trim.pipe(Schema.minLength(1));
const CreateRecipeBody = Schema.Struct({
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

export const recipesRoutes = HttpRouter.empty.pipe(
  HttpRouter.post(
    '/recipes',
    Effect.gen(function* () {
      const body = yield* HttpServerRequest.schemaBodyJson(CreateRecipeBody, {
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
      // Reject malformed UUIDs before they reach PostgreSQL; preserve the 404 contract.
      if (
        !id ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          id,
        )
      ) {
        return yield* HttpServerResponse.json(
          { message: 'Recipe not found' },
          { status: 404 },
        );
      }
      const reader = yield* RecipeRepository;
      const recipe = yield* reader.findById(id);
      return yield* recipe
        ? HttpServerResponse.json(recipe)
        : HttpServerResponse.json(
            { message: 'Recipe not found' },
            { status: 404 },
          );
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
