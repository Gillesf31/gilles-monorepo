# Local Recipe database

PostgreSQL 18 runs in Docker Compose for Recipe backend development. Versioned SQL
migrations recreate the Recipe schema; the Recipe API still returns fixed sample data.
The [database decision](../../docs/adr/0001-recipe-postgresql.md) explains the scope.

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

`verify.sql` checks defaults, primary keys, required instructions, the seed, and
the local RLS state. Its test writes are rolled back. Run verification as the
bootstrap database owner, just like migrations.

To inspect the version history:

```sh
docker compose exec -T postgres sh -c 'psql -X -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "TABLE public.schema_migrations;"'
```

For the next schema change, add `0002_<description>.sql` and its conditional
include/version insert to `apply.sql`, after `0001`. Keep applied migration files
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
- Both tables retain RLS, but local access policies are deferred until the API
  role and authorization are defined. The source has permissive public recipe
  policies and three `anon` shopping-list policies limited to `id = 'default'`.
  Locally, ordinary roles have no policies allowing access, even if later granted
  table privileges. Owners and superusers bypass RLS; the API must not use the
  bootstrap superuser.
- `gen_random_uuid()` is built into PostgreSQL 18, so these tables do not require
  a Supabase extension. Platform extensions are not recreated.
- The `default` shopping-list row is seeded from the existing repository migration
  `supabase/migrations/20260509170000_create_shopping_lists.sql`. This is application
  initialization, not a copy of remote shopping-list contents. Recipes start empty.

The reference dump is evidence, not a script to apply to this PostgreSQL instance.
API database integration, data import, and production deployment follow later.

Initial verification passed on PostgreSQL 18: fresh application, a repeated run
with one version record, the rolled-back SQL checks, and failure rollback in a
disposable database with a conflicting pre-existing table. A live catalog
comparison matched all 13 columns, defaults, nullability, primary keys, indexes,
RLS flags, triggers, and custom public functions. PostgreSQL 18 additionally
records `NOT NULL` in `pg_constraint`; that representation difference was excluded
from constraint comparison while column nullability was checked separately.

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

The API currently does not read a `DATABASE_URL`. When persistence is implemented,
its server-side connection string will use this format:

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
