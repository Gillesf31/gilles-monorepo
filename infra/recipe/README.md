# Local Recipe database

PostgreSQL 18 runs in Docker Compose for Recipe backend development. This first
step starts an empty database; the Recipe API still returns fixed sample data.
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
