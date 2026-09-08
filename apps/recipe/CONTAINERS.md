# Recipe production containers

## Run the complete app locally

First complete the [local database setup and API login](../../infra/recipe/README.md#api-database-login).
This provisions the existing restricted `recipe_api` role. Then create the
container's ignored credential file:

```sh
cp -n apps/recipe-api/.env.runtime.example apps/recipe-api/.env.runtime
chmod 600 apps/recipe-api/.env.runtime
```

Edit `.env.runtime` with the same database name and URL-encoded password as
`apps/recipe-api/.env`, using `postgres:5432` as the host and port. Credentials are
supplied at runtime and are never included in either image.

From the repository root, one command builds and starts the complete app:

```sh
pnpm nx run recipe:runtime-up
```

Open <http://localhost:8080>. PostgreSQL must become healthy, migrations and SQL
verification must finish successfully, and the API must become healthy before
the web container starts. The API has no host port; Nginx exposes the app only on
loopback. The [Compose startup conditions](https://docs.docker.com/compose/how-tos/startup-order/)
enforce this order.

This uses the same `gilles-recipe-dev_postgres-data` volume as development.
Existing recipes are shared with the development API. No data import or automatic
seed is performed. An empty database needs the one-time API password provisioning
above before the complete stack can start.

## Check and stop

```sh
pnpm nx run recipe-e2e:e2e-runtime
pnpm nx run recipe:runtime-check
```

The browser checks reuse the core creation, edit, pin, delete, and multiplier
workflows against the production containers, without starting development servers.
The runtime check creates its own recipe, stops and starts the entire Compose
stack (including PostgreSQL), verifies persistence, and deletes that recipe.
Expect a brief interruption to other local database users during this check.

To stop the complete stack without deleting the database:

```sh
docker compose -f infra/recipe/compose.yaml -f infra/recipe/compose.runtime.yaml stop
```

Run `recipe:runtime-up` again to rebuild and restart. For logs, use the same two
Compose files with `logs --tail 50 api web migrate`. Do not use `down --volumes`
unless you intend to delete the local database.

This is a local rehearsal using production builds. Public hosting, access
control, TLS, and backup/restore operations remain separate deployment work.
The existing `recipe:deploy` target still uploads only static frontend files.

## Frontend image

Build the frontend image from the repository root:

```sh
pnpm nx run recipe:docker:build
```

The target builds Angular in production mode, writes the existing build-version
metadata, and packages the static output with Nginx. The Docker context allows
only that output and the Nginx configuration; local credentials are excluded.

Nginx runs as an unprivileged user on port 8080. It serves Angular deep links,
service-worker assets, and `/version.json`. Missing static assets return 404.
HTML and assets must revalidate, while API responses use `Cache-Control: no-store`.

Connect it to the API container on a Docker network with the hostname `api`.
Requests to `/api/*` are forwarded to `api:3000/*`; creation responses expose a
usable `/api/recipes/:id` Location header. Docker DNS is refreshed so replacing
the API container does not require restarting Nginx.

The proxy behavior uses Nginx's [URI replacement and response-header rewriting](https://nginx.org/en/docs/http/ngx_http_proxy_module.html)
and [upstream DNS resolution](https://nginx.org/en/docs/http/ngx_http_upstream_module.html#server).
