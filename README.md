# Recipe

Angular recipe manager built in an Nx workspace.

The app stores recipes in Supabase in production and uses an in-memory recipe service during local development. The workspace is organized around thin apps and tagged libraries so feature code stays outside `apps/*`.

## Requirements

- Node.js compatible with Angular 21
- pnpm
- Supabase project URL and anon key

This repository enforces pnpm through `only-allow`. Run Nx through pnpm so commands use the workspace-local Nx version:

```bash
pnpm nx <command>
```

## Setup

Install dependencies:

```bash
pnpm install
```

Create local environment files:

```bash
cp apps/recipe/src/environments/environment.template.ts apps/recipe/src/environments/environment.ts
cp apps/recipe/src/environments/environment.prod.template.ts apps/recipe/src/environments/environment.prod.ts
```

Fill both files with the Supabase project URL and anon key from Supabase Project Settings > API.

Environment files are gitignored; only the `*.template.ts` files are committed.

## Development

Serve the recipe app:

```bash
pnpm nx serve recipe
```

Build the production app:

```bash
pnpm nx build recipe --configuration=production
```

Run the repo validation targets:

```bash
pnpm nx run-many -t lint test typecheck build --parallel=3
```

Run tests only:

```bash
pnpm nx run-many -t test --parallel=3
```

Run e2e tests:

```bash
pnpm nx e2e recipe-e2e
```

Explore the project graph:

```bash
pnpm nx graph
```

Inspect a project's resolved targets:

```bash
pnpm nx show project recipe --json
```

## Projects

Applications:

- `recipe` - Angular browser app in `apps/recipe`
- `recipe-e2e` - Playwright e2e project in `apps/recipe-e2e`

Recipe libraries:

- `shell` - route-level composition, app providers, and feature routing
- `feature-list` - recipe list screen
- `feature-add` - add recipe screen
- `feature-detail` - recipe detail screen
- `feature-edit` - edit recipe screen
- `app-version` - update notification behavior
- `recipe-data-access` - recipe service contracts and Supabase/in-memory implementations
- `recipe-model` - shared recipe types and pure ingredient helpers
- `recipe-ui` - reusable recipe presentation components

Shared libraries:

- `supabase` - Supabase client provider token
- `ui-theme` - theme service and toggle UI

## Architecture

Application projects stay thin. Keep bootstrap concerns in `apps/*`: app config, root routes, global metadata, assets, and environment wiring.

Put behavior in libraries with Nx tags:

- `type:shell` - route-level composition and providers
- `type:feature` - user-facing feature behavior and smart components
- `type:ui` - reusable presentation components
- `type:data-access` - API clients, persistence, and repository-style services
- `type:util` - generic helpers without feature ownership
- `type:model` - shared types and pure model definitions

Dependency direction is enforced by `@nx/enforce-module-boundaries`:

- apps depend on shell libraries
- shell libraries compose features, data access, utilities, and providers
- feature libraries depend on UI, data access, util, and model libraries
- UI libraries depend on UI, util, and model libraries
- data-access libraries depend on data-access, util, and model libraries
- model libraries depend only on model libraries

When adding app-wide behavior, implement it in the appropriate library and provide it from the shell.

## Useful Nx Commands

List projects:

```bash
pnpm nx show projects
```

Find projects with a target:

```bash
pnpm nx show projects --withTarget test
```

Run a target for one project:

```bash
pnpm nx run recipe-ui:test
```

Run targets for affected projects:

```bash
pnpm nx affected -t lint test typecheck build
```

Show Nx help for a command before using unfamiliar flags:

```bash
pnpm nx run-many --help
```

## Deployment

The `recipe` app has a `deploy` target:

```bash
pnpm nx deploy recipe
```

It builds the production app, writes `version.json`, and syncs `dist/apps/recipe/browser/` to the configured remote host. Check `apps/recipe/project.json` before changing the deployment destination.

## Notes

- Nx Cloud is configured through `nxCloudId` in `nx.json`.
- There is currently no committed GitHub Actions workflow.
- The root `package.json` does not currently define convenience scripts beyond `preinstall`; use `pnpm nx ...` directly.
