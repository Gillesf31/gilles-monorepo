import { NodeHttpServer, NodeRuntime } from '@effect/platform-node';
import { RecipeApiLive } from '@gilles-monorepo/recipe-api-shell';
import { Layer } from 'effect';
import { createServer } from 'node:http';

RecipeApiLive.pipe(
  Layer.provide(NodeHttpServer.layer(createServer, { port: 3000 })),
  Layer.launch,
  NodeRuntime.runMain,
);
