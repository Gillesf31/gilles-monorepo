-- Only recipe content is editable; IDs, timestamps and pins remain protected.
GRANT UPDATE (title, ingredients, instructions, is_work_in_progress)
    ON public.recipes TO recipe_api;
CREATE POLICY recipe_api_update ON public.recipes
    FOR UPDATE TO recipe_api USING (true) WITH CHECK (true);
