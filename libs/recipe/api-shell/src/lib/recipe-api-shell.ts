import { HttpServer } from '@effect/platform';
import { helloRoutes } from '@gilles-monorepo/recipe-feature-api-hello';

export const RecipeApiLive = helloRoutes.pipe(
  HttpServer.serve(),
  HttpServer.withLogAddress,
);
