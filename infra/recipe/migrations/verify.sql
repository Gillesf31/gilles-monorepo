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
       OR EXISTS (SELECT 1 FROM pg_policies
                  WHERE schemaname = 'public'
                    AND tablename IN ('recipes', 'shopping_lists')) THEN
        RAISE EXCEPTION 'Expected RLS enabled with no API policies yet';
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
ROLLBACK;
\echo 'Recipe schema verification passed (test writes rolled back)'
