-- Based on ../reference/supabase-public-2026-09-06.sql; adaptations in ../README.md.
CREATE TABLE public.recipes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    ingredients jsonb DEFAULT '[]'::jsonb NOT NULL,
    instructions text[] NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    is_work_in_progress boolean DEFAULT false NOT NULL,
    is_pinned boolean DEFAULT false NOT NULL,
    CONSTRAINT recipes_pkey PRIMARY KEY (id)
);

CREATE TABLE public.shopping_lists (
    id text NOT NULL,
    selected_recipe_ids text[] DEFAULT '{}'::text[] NOT NULL,
    multipliers_by_recipe_id jsonb DEFAULT '{}'::jsonb NOT NULL,
    checked_item_ids text[] DEFAULT '{}'::text[] NOT NULL,
    custom_items jsonb DEFAULT '[]'::jsonb NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT shopping_lists_pkey PRIMARY KEY (id)
);

-- Keep RLS enabled. API role grants and policies belong to the integration step.
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopping_lists ENABLE ROW LEVEL SECURITY;

-- Application seed from the existing shopping-list migration, not imported data.
INSERT INTO public.shopping_lists (id) VALUES ('default');
