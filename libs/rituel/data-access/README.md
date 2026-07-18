# rituel-data-access

The routine repository contract and its in-memory adapter live here. The
adapter exposes one signal-owned source of truth and resets to deterministic
seed data after each reload.

## Running unit tests

Run `pnpm nx test rituel-data-access` to execute the unit tests via
[Vitest](https://vitest.dev/).
