-- Allow recipe creation while keeping IDs, timestamps and pinning server-owned.
GRANT INSERT (title, ingredients, instructions, is_work_in_progress)
    ON public.recipes TO recipe_api;
CREATE POLICY recipe_api_create ON public.recipes
    FOR INSERT TO recipe_api WITH CHECK (true);
