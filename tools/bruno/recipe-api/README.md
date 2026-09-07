# Recipe API — Bruno

## Open in Bruno

1. Start PostgreSQL and apply migrations using the [database guide](../../../infra/recipe/README.md).
2. From the repository root, run `pnpm nx serve recipe-api`.
3. In Bruno, choose **Open Collection** and select `tools/bruno/recipe-api`
   (the directory containing `bruno.json`).
4. Select the **Local** environment, then run the collection in its numbered order.

`baseUrl` defaults to `http://localhost:3000`. There are no credentials in this
collection. The requests and tests work in Bruno's default Safe Mode.

## Coverage

The 19 requests cover all current endpoints:

- Hello and the recipe collection, including an empty collection.
- Creation with trimmed text and default flags, then GET by ID and list/detail consistency.
- Creation and retrieval of a work-in-progress recipe with no instructions.
- Missing and malformed recipe IDs (`404`).
- Missing/blank titles, empty/invalid ingredients, numeric quantities, invalid
  instructions and flags, client-supplied IDs/pins, and malformed JSON (`400`).

The create requests capture `recipeId` and `draftRecipeId` as runtime variables;
the following GET requests use those IDs automatically. Run creation first when
testing requests individually. To inspect an existing recipe in a fresh session,
set its ID in the **Local** environment instead. No seed is required for a full run.
`missingRecipeId` must remain a UUID that does not exist in your database.

**Each full run creates two persistent sample recipes**, named `Bruno omelette`
and `Bruno draft`. There is no DELETE endpoint yet. Failed creation must be fixed
before running its dependent GET requests; use the runner's stop-on-error option.

Storage outage (`503`), corrupt stored data (`500`), and database permission checks
remain in the [API integration tests](../../../apps/recipe-api/README.md#verify).
They require changes to database state and are not part of this normal collection run.

## Run from the terminal

With the API running, from the repository root:

```sh
cd tools/bruno/recipe-api
pnpm dlx @usebruno/cli@4.1.0 run --env Local --bail
```

This uses the CLI without adding a workspace dependency. Requests execute
sequentially; see the [Bruno CLI guide](https://docs.usebruno.com/bru-cli/runCollection).
