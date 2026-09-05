# Recipe API

A Node.js backend using stable Effect 3.

```sh
pnpm nx serve recipe-api
curl -i http://localhost:3000/hello
```

`GET /hello` returns status `200`, content type `text/plain; charset=utf-8`,
and the body `Hello World`. The server listens on port `3000`; stop it with
Ctrl+C. Effect manages the server lifetime and reports startup failures.

```sh
pnpm nx build recipe-api --configuration=production
pnpm nx run-many -t lint -p recipe-api,recipe-api-shell,recipe-feature-api-hello
pnpm nx test recipe-feature-api-hello
```

## Clean Architecture

Dependencies follow `recipe-api` → `recipe-api-shell` →
`recipe-feature-api-hello`, enforced by the existing Nx type tags.

- The app only bootstraps the Node runtime and supplies HTTP server configuration.
- The shell is the composition root for routes, dependencies, and Effect layers.
- The feature contains the hello HTTP adapter.
- Future domain rules and application use cases must remain independent of HTTP,
  Node.js, databases, and infrastructure implementations. Effect may be used in
  application logic; platform-specific packages stay at the outer boundary.
- HTTP adapters call application use cases. Infrastructure implements ports
  defined by the application when external capabilities are needed. Dependencies
  point inward; the shell supplies concrete implementations.

This constant response needs no domain model, repository, port, or use case.
Introduce those boundaries when recipe behavior requires them. Persistence,
authentication, frontend integration, CORS, Docker, and deployment are outside
this milestone.
