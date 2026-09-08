# Local Recipe database

PostgreSQL 18 runs in Docker Compose for Recipe backend development. Versioned SQL
migrations recreate the Recipe schema. API recipe reads, creation, updates, pin/unpin, and
deletion use this database.
The [database decision](../../docs/adr/0001-recipe-postgresql.md) explains the scope.

The shopping-list feature has been removed from Recipe. Its legacy table, seed,
and migration history remain intact; the application no longer accesses them.

To run production Angular and API containers against this same database, follow
the [container guide](../../apps/recipe/CONTAINERS.md). Its Compose overlay adds
migration verification, the API, and an Nginx proxy while preserving this volume.

## Start

Install Docker with Compose v2 and start its engine (Docker Desktop on macOS).
From the repository root:

```sh
cd infra/recipe
cp -n .env.example .env
docker compose up --wait --wait-timeout 60
```

The ignored `.env` contains local development credentials. Edit it before the
first start if needed. The example password is only for this local database.
If port 5432 is already occupied, change `POSTGRES_PORT` in `.env` and rerun
the start command.

Run all subsequent Compose commands from `infra/recipe`.

## Apply and verify migrations

After starting the container, run:

```sh
docker compose exec -T postgres sh -c 'PGPASSWORD="$POSTGRES_PASSWORD" psql -X -h 127.0.0.1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 -f /migrations/apply.sql'
docker compose exec -T postgres sh -c 'PGPASSWORD="$POSTGRES_PASSWORD" psql -X -h 127.0.0.1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 -f /migrations/verify.sql'
```

The migration directory is mounted read-only. Run `docker compose up --wait
--wait-timeout 60` again if an older container does not have that mount.

`apply.sql` runs the explicitly listed migrations and records their versions in
`public.schema_migrations`. A transaction covers schema changes, the default
shopping-list seed, and the version record. An advisory lock serializes concurrent
runs. A failure rolls back the transaction and returns a nonzero exit code;
rerunning skips recorded versions. Existing tables without a version record cause
an error, rather than being silently accepted as the correct schema.

`verify.sql` checks defaults, primary keys, required instructions, the seed,
RLS, and the API role's allowed reads/deletes and column-limited inserts/updates.
Updates to IDs and timestamps remain denied. Pin updates are allowed; pin values on insert remain denied. Its test writes are rolled back. Run verification as the
bootstrap database owner, just like migrations.

To inspect the version history:

```sh
docker compose exec -T postgres sh -c 'psql -X -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "TABLE public.schema_migrations;"'
```

For the next schema change, add `0007_<description>.sql` and its conditional
include/version insert to `apply.sql`, after `0006`. Keep applied migration files
immutable and correct mistakes with a new version; this small runner tracks
versions, not file checksums. Migration files must be transactional SQL without
their own `BEGIN`/`COMMIT`. There is no automatic down migration.

## Supabase source and local adaptations

The unmodified [public schema dump](reference/supabase-public-2026-09-06.sql) was
captured on 2026-09-06 UTC (2026-09-05 in Toronto) from the linked `recipes` project
`nsjuxzxkeadjqhzltsid`, running PostgreSQL `17.6.1.104`, with Supabase CLI `2.116.0`.
It contains schema definitions only, without application rows or credentials.

To capture a new reference, run from the repository root with Docker running and
Supabase CLI authentication available:

```sh
pnpm dlx supabase@2.116.0 projects list
pnpm dlx supabase@2.116.0 db dump --linked --schema public --file /tmp/recipe-supabase-public.sql
```

Confirm that `recipes` is the linked project before dumping. If this is a fresh
checkout, authenticate with `pnpm dlx supabase@2.116.0 login`, then link using
`pnpm dlx supabase@2.116.0 link --project-ref nsjuxzxkeadjqhzltsid`.
The linked-project cache is ignored by Git. `db dump` exports the schema without
updating application tables or migration history; see the
[Supabase CLI reference](https://supabase.com/docs/reference/cli/supabase-db-dump).
Do not use `db push`, remote `db reset`, or migration-history repair for capture.

The initial local migration preserves all 13 columns, their types, nullability,
defaults, and the two named primary keys with their indexes. The captured schema
has no foreign keys, additional indexes, custom public functions, or user triggers.
In particular, `instructions` is required and has no default; `ingredients` is
JSONB, and shopping-list recipe IDs are `text[]` without foreign keys.

These adaptations are intentional:

- Supabase owners, `anon`/`authenticated`/`service_role` grants, and default
  privileges are retained only in the reference dump. Local tables belong to the
  migration role. No Supabase roles or platform schemas are created locally.
- The initial migration retained RLS without copying access policies. Migration
  `0002_recipe_api_reader` now grants `recipe_api` SELECT on recipes through an
  explicit RLS policy. Migration `0003_recipe_api_create` grants INSERT only on
  title, ingredients, instructions, and is_work_in_progress, with an INSERT policy.
  Migration `0004_recipe_api_update` grants UPDATE only on those same columns;
  `0005_recipe_api_delete` grants DELETE on recipes. Each adds its operation-specific
  RLS policy. Migration `0006_recipe_api_pin` adds UPDATE permission for is_pinned
  and reuses the existing UPDATE policy. The source has permissive public recipe
  policies and three `anon` shopping-list policies limited to `id = 'default'`.
  Locally, only `recipe_api` has policies allowing recipe reads, creation, updates, and deletion; shopping lists
  still have no access policy. Owners and superusers bypass RLS; the API must not use the
  bootstrap superuser.
- `gen_random_uuid()` is built into PostgreSQL 18, so these tables do not require
  a Supabase extension. Platform extensions are not recreated.
- The `default` shopping-list row is seeded from the existing repository migration
  `supabase/migrations/20260509170000_create_shopping_lists.sql`. This is application
  initialization, not a copy of remote shopping-list contents. Recipes start empty.

The reference dump is evidence, not a script to apply to this PostgreSQL instance.
Collection and recipe-by-ID reads now use the local database. Data import and production
deployment follow later.

Initial verification passed on PostgreSQL 18: fresh application, a repeated run
with one version record, the rolled-back SQL checks, and failure rollback in a
disposable database with a conflicting pre-existing table. A live catalog
comparison matched all 13 columns, defaults, nullability, primary keys, indexes,
RLS flags, triggers, and custom public functions. PostgreSQL 18 additionally
records `NOT NULL` in `pg_constraint`; that representation difference was excluded
from constraint comparison while column nullability was checked separately.

## Local development seed

After applying migrations, run from `infra/recipe`:

```sh
docker compose exec -T postgres sh -c 'psql -X -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1' < seed.sql
```

This explicitly adds a local Scrambled eggs recipe with UUID
`00000000-0000-4000-8000-000000000001`. Rerunning skips an existing row with that ID,
so it does not duplicate the recipe or overwrite edits. The seed is optional and
separate from versioned schema migrations; it does not import Supabase data.
Run it only against the local development Compose database.

With the API running, open `/recipes`, then `/recipes/<id>` using an ID from that
response. The seeded example is available at
`/recipes/00000000-0000-4000-8000-000000000001`. Without seed or other data, the
collection returns an empty array.

## API database login

After applying migrations, `recipe_api` has SELECT and DELETE access to recipes,
and INSERT/UPDATE access to title, ingredients, instructions, and
is_work_in_progress. UPDATE is also allowed on is_pinned, using the existing RLS
policy. PostgreSQL permissions apply to the role, not individual HTTP routes;
the API keeps pin changes in the dedicated PATCH handler. The role cannot supply
or change IDs/timestamps, insert pin values, access shopping lists
or the migration ledger, bypass RLS, or administer roles/databases. The role is cluster-wide; an
existing role with elevated attributes or memberships causes migration `0002` to
fail. It has a five-second statement timeout. No password is stored in SQL.

From `infra/recipe`, open psql as the bootstrap role:

```sh
docker compose exec postgres sh -c 'psql -X -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
```

Run `\password recipe_api`, enter a local development password when prompted,
then run `\q`. From the repository root:

```sh
cp -n apps/recipe-api/.env.example apps/recipe-api/.env
chmod 600 apps/recipe-api/.env
```

Edit that ignored file with `DATABASE_URL` for `recipe_api`, using the configured
local port and database name. URL-encode special characters in the password.
Nx loads this file when running `pnpm nx serve recipe-api`. Password changes do
not require a new migration; update the ignored file and restart the API.
Do not put these credentials in frontend environment files.

## Verify and connect

```sh
docker compose ps
docker compose exec -T postgres sh -c 'PGPASSWORD="$POSTGRES_PASSWORD" psql -h 127.0.0.1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 -c "SELECT 1 AS connection_ok;"'
```

Expect a healthy service and `connection_ok` equal to `1`. This query uses TCP
and password authentication inside the container. To open an interactive SQL
session, omit `-T` and the final `-c "SELECT ..."` argument.

For a database client on your machine, use host `127.0.0.1`, the configured port
(5432 by default), and the database/user/password from `.env`. The published port
is bound to loopback. The image creates a bootstrap superuser; add a separate,
restricted application role when connecting the API.

The API reads a server-side `DATABASE_URL` with this format:

```text
postgresql://<user>:<url-encoded-password>@127.0.0.1:<port>/recipe
```

## Stop and restart

```sh
docker compose stop
docker compose up --wait --wait-timeout 60
```

To remove the container and network while keeping database contents:

```sh
docker compose down
```

The named volume `gilles-recipe-dev_postgres-data` survives these commands.
Do not add `--volumes` to `down` unless you intend to delete the local database.
Changing database credentials in `.env` does not update an initialized volume;
existing roles/passwords must be changed in PostgreSQL too.

## Troubleshooting

```sh
docker compose logs --tail 50 postgres
```

If Docker cannot connect to its daemon, start Docker Desktop and retry. The first
start downloads the image and requires network access. Keep the image on major
version 18; upgrading the major version requires an explicit data upgrade or
dump/restore, not just changing the image tag.

PostgreSQL 18's official image stores data below `/var/lib/postgresql`, which is
why the volume is mounted there. See the [official image documentation](https://hub.docker.com/_/postgres)
and [Docker port-publishing documentation](https://docs.docker.com/engine/network/port-publishing/).
