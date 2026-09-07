# Gilles Monorepo

An Nx workspace for several Angular applications, currently Recipe and Rituel.

Recipe uses its Node.js/Effect HTTP API backed by PostgreSQL, with cached offline browsing. Shopping lists still use Supabase in production and local storage during development. Rituel manages recurring home maintenance. The workspace is organized around thin apps and tagged libraries so feature code stays outside `apps/*`.

## Requirements

- Node.js compatible with Angular 21
- pnpm
- Docker with Compose for local PostgreSQL
- Supabase project URL and anon key for production shopping lists

This repository enforces pnpm through `only-allow`. Run Nx through pnpm so commands use the workspace-local Nx version:

```bash
pnpm nx <command>
```

## Setup

Install dependencies:

```bash
pnpm install
```

Recipe still uses Supabase for production shopping lists. Create its Angular environment files:

```bash
cp apps/recipe/src/environments/environment.template.ts apps/recipe/src/environments/environment.ts
cp apps/recipe/src/environments/environment.prod.template.ts apps/recipe/src/environments/environment.prod.ts
```

Fill both files with the Supabase project URL and anon key from Supabase Project Settings > API.

Environment files are gitignored; only the `*.template.ts` files are committed.

## Development

For Recipe, first follow the [database setup](infra/recipe/README.md) and configure
`apps/recipe-api/.env` using the restricted database role. Start the API and Angular
in separate terminals:

```bash
pnpm nx serve recipe-api
pnpm nx serve recipe
```

Angular requests `/api/recipes`; its development proxy forwards `/api/*` to
`http://127.0.0.1:3000/*`. All recipe operations use the real database, including
pin/unpin. Offline browsing uses `recipe-api-catalogue-cache`, separate from the
old Supabase cache. A successful catalogue load creates the new local copy.

Serve another application:

```bash
pnpm nx serve rituel
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

Recipe browser tests require the local database, all migrations, and API credentials.
They start Angular and the API (or reuse an already-running API locally), create
uniquely identified recipes, and delete their own fixtures afterward. Run them
without Nx caching because database state is external:

```bash
pnpm nx run recipe-e2e:e2e --skipNxCache -- --project=chromium
pnpm nx run recipe-e2e:e2e-offline
```

Run other e2e tests:

```bash
pnpm nx e2e rituel-e2e
```

Explore the project graph:

```bash
pnpm nx graph
```

Inspect a project's resolved targets:

```bash
pnpm nx show project rituel --json
```

## Projects

Applications:

- `recipe` - Angular browser app in `apps/recipe`
- `recipe-e2e` - Playwright e2e project in `apps/recipe-e2e`
- `rituel` - Angular browser app for recurring home maintenance in `apps/rituel`
- `rituel-e2e` - Playwright e2e project in `apps/rituel-e2e`

Recipe libraries:

- `shell` - route-level composition, app providers, and feature routing
- `feature-list` - recipe list screen
- `feature-add` - add recipe screen
- `feature-detail` - recipe detail screen
- `feature-edit` - edit recipe screen
- `feature-app-version` - update notification behavior
- `recipe-data-access` - HTTP recipe adapter, offline cache, and shopping-list adapters
- `recipe-model` - shared recipe types and pure ingredient helpers
- `recipe-ui` - reusable recipe presentation components, including recipe cards
- `recipe-ingredient-ui` - reusable ingredient editor and ingredient list components

Rituel libraries:

- `rituel-shell` - route-level composition for Rituel
- `feature-dashboard` - dashboard for routines due now and coming up
- `feature-create-task` - create a recurring home-maintenance routine
- `feature-edit-task` - edit or remove an existing routine

Shared libraries:

- `util-supabase` - Supabase client provider token
- `feature-theme` - theme service and toggle UI

## Architecture

Application projects stay thin. Keep bootstrap concerns in `apps/*`: app config, root routes, global metadata, assets, and environment wiring.

### Styling

Use Tailwind utility classes for component styling whenever possible. Reserve custom CSS for cases Tailwind cannot express cleanly, such as global styles, complex animations, or reusable design tokens.

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

The production host must run the Recipe API and route `/api/*` to it with the
`/api` prefix stripped. The Angular development proxy does not apply to static
production hosting. API hosting and authentication must be configured before
publishing this frontend; the current API is intended for local development.

The deploy target only publishes the frontend. It builds the production app, writes `version.json`, and syncs `dist/apps/recipe/browser/` to the configured remote host. Check `apps/recipe/project.json` before changing the deployment destination.

## Notes

- Nx Cloud is configured through `nxCloudId` in `nx.json`.
- There is currently no committed GitHub Actions workflow.
- The root `package.json` does not currently define convenience scripts beyond `preinstall`; use `pnpm nx ...` directly.
