<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

# General Guidelines for working with Nx

- For navigating/exploring the workspace, invoke the `nx-workspace` skill first - it has patterns for querying projects, targets, and dependencies
- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- Prefix nx commands with the workspace's package manager (e.g., `pnpm nx build`, `npm exec nx test`) - avoids using globally installed CLI
- You have access to the Nx MCP server and its tools, use them to help the user
- For Nx plugin best practices, check `node_modules/@nx/<plugin>/PLUGIN.md`. Not all plugins have this file - proceed without it if unavailable.
- NEVER guess CLI flags - always check nx_docs or `--help` first when unsure

## Scaffolding & Generators

- For scaffolding tasks (creating apps, libs, project structure, setup), ALWAYS invoke the `nx-generate` skill FIRST before exploring or calling MCP tools

## When to use nx_docs

- USE for: advanced config options, unfamiliar flags, migration guides, plugin configuration, edge cases
- DON'T USE for: basic generator syntax (`nx g @nx/react:app`), standard commands, things you already know
- The `nx-generate` skill handles generator discovery internally - don't call nx_docs just to look up generator syntax

<!-- nx configuration end-->

# Recipe Workspace Architecture

- Keep application projects thin. Do not put services, data access, domain logic, UI logic, or feature behavior in `apps/*`.
- Application projects should only compose bootstrap concerns such as app config, root routes, global metadata, assets, and environment wiring.
- Put behavior in libraries with the correct Nx tags:
  - `type:shell`: route-level composition and providers that assemble the app experience.
  - `type:feature`: user-facing feature behavior, feature providers, smart components, and app behavior modules.
  - `type:ui`: reusable presentation components.
  - `type:data-access`: API clients, persistence, and repository-style services.
  - `type:util`: generic helpers without feature ownership.
  - `type:model`: shared types and pure model definitions.
- Respect the dependency direction enforced by `@nx/enforce-module-boundaries`: apps depend on shell libraries; shell libraries compose feature/data/util libraries; features do not depend back on shells or apps.
- When adding app-wide behavior, implement it in a feature or other appropriate library and provide it from the shell, not directly from the app.
