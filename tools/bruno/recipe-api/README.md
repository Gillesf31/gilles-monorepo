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

The 45 requests cover all current endpoints:

- Hello and the recipe collection, including an empty collection.
- Creation with trimmed text and default flags, then GET by ID and list/detail consistency.
- Creation and retrieval of a work-in-progress recipe with no instructions.
- Updates with trimmed content and consistent detail/list responses.
- Rejected partial updates, pin changes, and malformed update JSON (`400`).
- Pin and unpin with persisted status and unchanged recipe content.
- Invalid pin bodies, extra fields, malformed JSON, and missing/malformed pin IDs.
- Deletion, repeated deletion, missing detail after deletion, and list cleanup.
- Missing and malformed recipe IDs for reads, updates, and deletes (`404`).
- Missing/blank titles, empty/invalid ingredients, numeric quantities, invalid
  instructions and flags, client-supplied IDs/pins, and malformed JSON (`400`).

The create requests capture `recipeId` and `draftRecipeId` as runtime variables;
the following GET requests use those IDs automatically. Run creation first when
testing requests individually. To inspect an existing recipe in a fresh session,
set its ID in the **Local** environment instead. No seed is required for a full run.
`missingRecipeId` must remain a UUID that does not exist in your database.

**Each successful full run creates and then deletes two sample recipes**, named
`Bruno omelette` (renamed by PUT) and `Bruno draft`. Cleanup requests only delete
the IDs captured by this collection's creation requests. Failed or interrupted runs
may leave samples; finish their cleanup requests in the same runtime session.
Use the runner's stop-on-error option and fix failures before continuing dependent
requests. The collection does not delete samples left by earlier runs.

Requests 20–45 extend the original creation/read checks into a complete
create → fetch → update → verify → pin → fetch → unpin → fetch → delete → verify-absence flow. PUT replaces
all editable fields; partial bodies are invalid. Deletion is permanent, returns
an empty `204`, and returns `404` when repeated. Pin requests 28–37 run before
cleanup; they require an explicit boolean and return the complete recipe.

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
