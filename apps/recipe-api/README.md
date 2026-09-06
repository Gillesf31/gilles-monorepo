# Recipe API

A Node.js backend using stable Effect 3.

The API provides `/hello` to validate the backend setup and `/recipes` to establish
the recipe JSON response shape using a fixed sample. Persistence and frontend
integration will follow.

Local PostgreSQL is available through [Docker Compose](../../infra/recipe/README.md).
See the [database decision](../../docs/adr/0001-recipe-postgresql.md) for the migration
direction. The API is not connected to this database yet.

```sh
pnpm nx serve recipe-api
curl -i http://localhost:3000/hello
curl -i http://localhost:3000/recipes
```

`GET /hello` returns status `200`, content type `text/plain; charset=utf-8`,
and the body `Hello World`. The server listens on port `3000`; stop it with
Ctrl+C. Effect manages the server lifetime and reports startup failures.

`GET /recipes` returns status `200`, content type `application/json`, and an array
containing one fixed sample recipe with `id`, `title`, `ingredients`,
`instructions`, `isWorkInProgress`, and `isPinned`. It does not read from Supabase
or persist data.

```sh
pnpm nx build recipe-api --configuration=production
pnpm nx run-many -t lint -p recipe-api,recipe-api-shell,recipe-feature-api-hello,recipe-feature-api-recipes
pnpm nx run-many -t test -p recipe-feature-api-hello,recipe-feature-api-recipes
```

## Clean Architecture

Dependencies follow `recipe-api` → `recipe-api-shell` →
`recipe-feature-api-hello` and `recipe-feature-api-recipes`, enforced by the
existing Nx type tags. The recipes feature uses the shared `recipe-model` type.

- The app only bootstraps the Node runtime and supplies HTTP server configuration.
- The shell is the composition root for routes, dependencies, and Effect layers.
- The features contain the hello and recipes HTTP adapters.
- Future domain rules and application use cases must remain independent of HTTP,
  Node.js, databases, and infrastructure implementations. Effect may be used in
  application logic; platform-specific packages stay at the outer boundary.
- HTTP adapters call application use cases. Infrastructure implements ports
  defined by the application when external capabilities are needed. Dependencies
  point inward; the shell supplies concrete implementations.

These fixed responses need no repository, port, or use case. Introduce those
boundaries when recipe behavior requires them. Persistence,
authentication, frontend integration, CORS, API containerization, and deployment are outside
this milestone.
