import { HttpRouter, HttpServer } from '@effect/platform';
import { PgClient } from '@effect/sql-pg';
import { RecipeRepository } from '@gilles-monorepo/recipe-api-data-access';
import { helloRoutes } from '@gilles-monorepo/recipe-feature-api-hello';
import { recipesRoutes } from '@gilles-monorepo/recipe-feature-api-recipes';
import { Config, Layer } from 'effect';

export const RecipeDatabaseLive = RecipeRepository.Default.pipe(
  Layer.provide(
    PgClient.layerConfig({
      url: Config.redacted('DATABASE_URL'),
      connectTimeout: Config.succeed('5 seconds'),
    }),
  ),
);

export const RecipeApiLive = HttpRouter.concatAll(
  helloRoutes,
  recipesRoutes,
).pipe(
  HttpServer.serve(),
  HttpServer.withLogAddress,
  Layer.provide(RecipeDatabaseLive),
);
