# Recipe: own PostgreSQL database with local Docker Compose

Accepted on 2026-09-05.

Recipe will replace its Supabase backend with the repository's Node.js / Effect
API and a PostgreSQL database under our control. Keeping PostgreSQL preserves the
existing SQL, arrays, and JSONB model while moving data access behind our API.
We chose our own setup rather than Neon; production may eventually run on AWS,
but the hosting service and deployment design are undecided.

For development, use the official PostgreSQL 18 image in Docker Compose, a named
volume, a loopback-only published port, and ignored local credentials. The first
milestone is an empty, running database with a verified SQL connection. Setup and
operating commands live in [infra/recipe](../../infra/recipe/README.md).

As of 2026-09-07, versioned SQL migrations and persistent recipe reads, creation,
updates, deletion, and pinning are implemented. Angular uses the Node.js / Effect
API. Persistence belongs in a backend data-access library, assembled by the API
shell; database credentials stay server-side.

The shopping-list feature was removed rather than migrated. Its legacy database
table, seed, and migration history remain; removing the table is optional future
cleanup through a new migration.

Owning database operations means planning backups outside the server and testing
restores before production. The development Compose configuration is not a
production deployment plan, and its persistent volume is not a backup.
