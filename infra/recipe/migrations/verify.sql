\set ON_ERROR_STOP on

-- Test writes are rolled back, including when psql exits on an error.
BEGIN;
DO $$
DECLARE
    recipe public.recipes;
    shopping_list public.shopping_lists;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.schema_migrations WHERE version = '0001_initial'
    ) THEN
        RAISE EXCEPTION 'Initial migration is not recorded';
    END IF;

    IF (SELECT count(*) FROM pg_class
        WHERE oid IN ('public.recipes'::regclass, 'public.shopping_lists'::regclass)
          AND relrowsecurity) <> 2
       OR (SELECT count(*) FROM pg_policies
           WHERE schemaname = 'public' AND tablename IN ('recipes', 'shopping_lists')) <> 2
       OR NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public'
           AND tablename = 'recipes' AND policyname = 'recipe_api_read'
           AND cmd = 'SELECT' AND roles = ARRAY['recipe_api']::name[] AND qual = 'true')
       OR NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public'
           AND tablename = 'recipes' AND policyname = 'recipe_api_create'
           AND cmd = 'INSERT' AND roles = ARRAY['recipe_api']::name[] AND with_check = 'true') THEN
        RAISE EXCEPTION 'Expected RLS enabled with only the API recipe read and create policies';
    END IF;

    INSERT INTO public.recipes (title, instructions)
    VALUES ('Migration verification', ARRAY['Mix', 'Serve'])
    RETURNING * INTO recipe;

    IF recipe.id IS NULL OR recipe.created_at IS DISTINCT FROM now()
       OR recipe.ingredients IS DISTINCT FROM '[]'::jsonb
       OR recipe.is_work_in_progress IS DISTINCT FROM false
       OR recipe.is_pinned IS DISTINCT FROM false
       OR recipe.instructions IS DISTINCT FROM ARRAY['Mix', 'Serve'] THEN
        RAISE EXCEPTION 'Recipe defaults or array storage differ';
    END IF;

    BEGIN
        INSERT INTO public.recipes (id, title, instructions)
        VALUES (recipe.id, 'Duplicate', '{}');
        RAISE EXCEPTION 'Duplicate recipe ID was accepted';
    EXCEPTION WHEN unique_violation THEN NULL;
    END;

    BEGIN
        INSERT INTO public.recipes (title) VALUES ('Missing instructions');
        RAISE EXCEPTION 'Missing instructions were accepted';
    EXCEPTION WHEN not_null_violation THEN NULL;
    END;

    IF NOT EXISTS (SELECT 1 FROM public.shopping_lists WHERE id = 'default') THEN
        RAISE EXCEPTION 'Default shopping list seed is missing';
    END IF;

    INSERT INTO public.shopping_lists (id) VALUES (recipe.id::text)
    RETURNING * INTO shopping_list;
    IF shopping_list.selected_recipe_ids IS DISTINCT FROM '{}'::text[]
       OR shopping_list.multipliers_by_recipe_id IS DISTINCT FROM '{}'::jsonb
       OR shopping_list.checked_item_ids IS DISTINCT FROM '{}'::text[]
       OR shopping_list.custom_items IS DISTINCT FROM '[]'::jsonb
       OR shopping_list.updated_at IS DISTINCT FROM now() THEN
        RAISE EXCEPTION 'Shopping list defaults differ';
    END IF;

    BEGIN
        INSERT INTO public.shopping_lists (id) VALUES (shopping_list.id);
        RAISE EXCEPTION 'Duplicate shopping list ID was accepted';
    EXCEPTION WHEN unique_violation THEN NULL;
    END;
END;
$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.schema_migrations WHERE version = '0002_recipe_api_reader')
       OR NOT EXISTS (SELECT 1 FROM public.schema_migrations WHERE version = '0003_recipe_api_create')
       OR EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'recipe_api'
           AND (rolsuper OR rolcreatedb OR rolcreaterole OR rolreplication OR rolbypassrls))
       OR EXISTS (SELECT 1 FROM pg_auth_members WHERE member = 'recipe_api'::regrole)
       OR NOT has_table_privilege('recipe_api', 'public.recipes', 'SELECT')
       OR has_table_privilege('recipe_api', 'public.recipes', 'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
       OR NOT has_column_privilege('recipe_api', 'public.recipes', 'title', 'INSERT')
       OR NOT has_column_privilege('recipe_api', 'public.recipes', 'ingredients', 'INSERT')
       OR NOT has_column_privilege('recipe_api', 'public.recipes', 'instructions', 'INSERT')
       OR NOT has_column_privilege('recipe_api', 'public.recipes', 'is_work_in_progress', 'INSERT')
       OR has_column_privilege('recipe_api', 'public.recipes', 'id', 'INSERT')
       OR has_column_privilege('recipe_api', 'public.recipes', 'created_at', 'INSERT')
       OR has_column_privilege('recipe_api', 'public.recipes', 'is_pinned', 'INSERT')
       OR has_table_privilege('recipe_api', 'public.shopping_lists', 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
       OR has_table_privilege('recipe_api', 'public.schema_migrations', 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') THEN
        RAISE EXCEPTION 'Expected a restricted API role with recipe reads and limited inserts';
    END IF;
END;
$$;

SET LOCAL ROLE recipe_api;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.recipes WHERE title = 'Migration verification') THEN
        RAISE EXCEPTION 'API role cannot read recipes through RLS';
    END IF;
    INSERT INTO public.recipes (title, instructions) VALUES ('API creation verification', '{}');
    IF NOT EXISTS (SELECT 1 FROM public.recipes WHERE title = 'API creation verification') THEN
        RAISE EXCEPTION 'API role cannot create and read recipes through RLS';
    END IF;
    BEGIN
        UPDATE public.recipes SET title = 'Forbidden';
        RAISE EXCEPTION 'API role unexpectedly updated a recipe';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
    BEGIN
        DELETE FROM public.recipes;
        RAISE EXCEPTION 'API role unexpectedly deleted recipes';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
    BEGIN
        PERFORM 1 FROM public.shopping_lists;
        RAISE EXCEPTION 'API role unexpectedly read shopping lists';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
END;
$$;
ROLLBACK;
\echo 'Recipe schema verification passed (test writes rolled back)'
