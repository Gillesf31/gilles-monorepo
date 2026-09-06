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

Subsequent milestones will capture the actual Supabase schema, introduce versioned
SQL migrations, and connect persistent recipe reads before migrating writes and
shopping lists. Persistence belongs in a backend data-access library, assembled
by the API shell; database credentials stay server-side. The current frontend and
API behavior remain in place until those slices are implemented.

Owning database operations means planning backups outside the server and testing
restores before production. The development Compose configuration is not a
production deployment plan, and its persistent volume is not a backup.
