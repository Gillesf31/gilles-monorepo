import { HttpRouter, HttpServer } from '@effect/platform';
import { helloRoutes } from '@gilles-monorepo/recipe-feature-api-hello';
import { recipesRoutes } from '@gilles-monorepo/recipe-feature-api-recipes';

export const RecipeApiLive = HttpRouter.concatAll(
  helloRoutes,
  recipesRoutes,
).pipe(HttpServer.serve(), HttpServer.withLogAddress);
