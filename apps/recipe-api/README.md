# Recipe API

The Recipe backend uses Node.js and stable Effect 3. It will replace Supabase
incrementally. Both `GET /recipes` and `GET /recipes/:id` read local PostgreSQL;
`POST /recipes`, `PUT /recipes/:id`, and `DELETE /recipes/:id` create, edit, and delete recipes in the same database.
`PATCH /recipes/:id/pin` sets pin status. Angular recipe operations now use this API through `/api/recipes`; its development
proxy strips `/api`. Production shopping-list storage still uses Supabase.

## Run locally

Start PostgreSQL, apply migrations, and provision the `recipe_api` password using
[the database guide](../../infra/recipe/README.md#api-database-login). Then, from
the repository root:

```sh
cp -n apps/recipe-api/.env.example apps/recipe-api/.env
# Edit apps/recipe-api/.env with the restricted role's URL-encoded password.
pnpm nx serve recipe-api
```

Nx loads the ignored project `.env`. `DATABASE_URL` stays server-side and must use
`recipe_api`, not the bootstrap superuser. Missing configuration or an initial
connection failure prevents startup. Effect manages the pool and server lifetime;
Ctrl+C shuts them down. The server listens on port `3000`.

```sh
curl -i http://localhost:3000/hello
curl -i http://localhost:3000/recipes
# Available after running the optional local development seed.
curl -i http://localhost:3000/recipes/00000000-0000-4000-8000-000000000001
curl -i http://localhost:3000/recipes/unknown
```

| Endpoint                 | Behavior                                                                                                     |
| ------------------------ | ------------------------------------------------------------------------------------------------------------ |
| `GET /hello`             | `200`, `text/plain; charset=utf-8`, `Hello World`                                                            |
| `GET /recipes`           | `200`, persisted recipes ordered newest first; `[]` when empty                                               |
| `POST /recipes`          | `201`, persisted recipe and `Location: /recipes/<id>`; invalid JSON or fields returns `400`                  |
| `GET /recipes/:id`       | `200`, persisted recipe; missing or malformed UUID returns `404` with `{"message":"Recipe not found"}`       |
| `PUT /recipes/:id`       | `200`, updated recipe; invalid body returns `400`; missing or malformed UUID returns `404`                   |
| `PATCH /recipes/:id/pin` | `200`, recipe with requested pin status; invalid body returns `400`; missing or malformed UUID returns `404` |
| `DELETE /recipes/:id`    | `204`, no body; missing or malformed UUID returns `404`                                                      |

Recipe responses retain `id`, `title`, `ingredients`, `instructions`,
`isWorkInProgress`, and `isPinned`. Database rows are validated before mapping;
legacy ingredient strings are normalized using the shared model helper.
A database query failure returns `503` with `{"message":"Recipe storage unavailable"}`;
invalid stored data returns `500` with `{"message":"Unable to load recipe"}`.
All recipe responses except the empty `204` use `application/json` and omit database error details.

There is no hardcoded collection fallback. Every listed recipe can be opened with
its returned UUID (unless it is deleted between requests). To add a local example,
run the [optional development seed](../../infra/recipe/README.md#local-development-seed).
The seed's UUID is `00000000-0000-4000-8000-000000000001`; `/recipes/1` remains an
invalid UUID and returns `404`. Data import, authentication, production API hosting, and shopping-list migration
are subsequent slices.

## Create a recipe

Apply migration `0003_recipe_api_create` before using the endpoint. From the
repository root, with the API running:

```sh
curl -i http://localhost:3000/recipes \
  -H 'Content-Type: application/json' \
  -d '{"title":"Omelette","ingredients":[{"name":"eggs","quantity":"2","unit":""}],"instructions":["Beat the eggs.","Cook gently."],"isWorkInProgress":false}'
```

The body requires a nonblank `title`, at least one structured ingredient with a
nonblank `name` and string `quantity`/`unit`, and an `instructions` array. Each
instruction must be nonblank; an empty array is allowed, matching the current
creation form. Text is trimmed. `isWorkInProgress` is optional and defaults to
`false`. Unknown fields (including `id` and `isPinned`) are rejected. PostgreSQL
generates the UUID and timestamp and defaults `isPinned` to `false`.
Malformed JSON or invalid fields return `400` with `{"message":"Invalid recipe"}`
before writing. Successful requests return the full recipe and its detail URL
in the `Location` header. Repeating a POST creates another recipe.
This local development endpoint has no authentication yet.

## Edit or delete a recipe

Apply migrations `0004_recipe_api_update` and `0005_recipe_api_delete` using the
same migration runner before using these endpoints.

`PUT /recipes/:id` replaces all editable fields using the same body and validation
as POST. Title, ingredients, and instructions are required; omitting
`isWorkInProgress` sets it to `false`. It preserves the ID, creation timestamp, and
pin status. Partial bodies and unknown fields are rejected with `400`. An existing
recipe returns `200` with the complete updated recipe; a missing recipe is never
created. Update and response decoding share a transaction.

`DELETE /recipes/:id` permanently deletes that recipe and returns `204` with no
body. It does not modify other recipes or shopping lists. Repeating the deletion
returns `404`. Both endpoints reject malformed UUIDs before querying PostgreSQL
and return `404` with `{"message":"Recipe not found"}` for missing recipes.
For PUT, the UUID is checked before the body; a valid UUID with an invalid body
returns `400` before looking up the recipe.

Use the [Bruno collection](../../tools/bruno/recipe-api/README.md) to create a sample,
edit it, verify persistence, and delete it. These local development endpoints
have no authentication yet.

## Pin or unpin a recipe

Apply migration `0006_recipe_api_pin`, then send `PATCH /recipes/:id/pin` with
`{"isPinned":true}` to pin or `{"isPinned":false}` to unpin. The boolean is required;
missing values, strings, malformed JSON, and extra fields return `400` with
`{"message":"Invalid pin status"}`. IDs follow the same `404` rules as PUT.

A successful request returns `200` with the complete recipe. Repeating the same
request keeps the requested state. Only pin status changes; content, ID, and
creation timestamp are preserved. Response decoding shares the transaction, so
invalid stored data returns the existing `500` response and rolls back the change.
POST and PUT still reject `isPinned`; pinning uses this dedicated endpoint.

## Verify

For interactive testing, open the [Bruno collection](../../tools/bruno/recipe-api/README.md)
and select **Local**. It covers every current endpoint, creates recipes, carries
their IDs through reads, updates, pin/unpin, and deletes, and checks validation and not-found responses.

```sh
pnpm nx build recipe-api --configuration=production
CI=true pnpm nx run-many -t lint,typecheck,test -p recipe-api,recipe-api-shell,recipe-api-data-access,recipe-feature-api-hello,recipe-feature-api-recipes
# Requires Docker, applied migrations, and apps/recipe-api/.env from the setup above.
RECIPE_DB_INTEGRATION=1 CI=true pnpm nx run recipe-feature-api-recipes:test --skipNxCache
```

Ordinary tests replace the repository with an Effect service. The opt-in integration
suite uses the local Compose database, inserts a temporary recipe with a unique
UUID through the bootstrap role, exercises HTTP responses using the real restricted
PostgreSQL repository, creates a recipe through POST, follows it through both GET
routes, updates and deletes it, checks preservation of IDs/timestamps/pins and
pin/unpin persistence and idempotency, denied ID/timestamp updates and shopping-list reads, and cleans up its fixtures
afterward. Keep integration tests uncached because database state is
external to Nx. An interrupted test may leave its uniquely identified fixture.

## Architecture

The app bootstraps Node and the HTTP server. The shell composes routes and provides
`RecipeRepository` with a scoped `@effect/sql-pg` pool configured from `DATABASE_URL`.
The recipes feature handles HTTP validation and status mapping. The backend
`recipe-api-data-access` library owns SQL collection reads, parameterized ID lookup, transactional inserts/updates, deletion, and shared row decoding;
`recipe-model` supplies the existing Recipe type and ingredient normalization.
The frontend `recipe-data-access` library remains separate from the Node adapter.

The shared model stays independent of HTTP and PostgreSQL. Introduce application
use cases when domain behavior requires them. See the
[database decision](../../docs/adr/0001-recipe-postgresql.md) for the migration direction.
