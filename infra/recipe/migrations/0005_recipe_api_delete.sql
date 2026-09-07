GRANT DELETE ON public.recipes TO recipe_api;
CREATE POLICY recipe_api_delete ON public.recipes
    FOR DELETE TO recipe_api USING (true);
