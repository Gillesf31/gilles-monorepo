-- Reuse the recipe UPDATE policy; only add permission for the pin column.
GRANT UPDATE (is_pinned) ON public.recipes TO recipe_api;
