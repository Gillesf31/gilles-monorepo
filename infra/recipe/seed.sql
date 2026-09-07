\set ON_ERROR_STOP on

-- Optional local development data. Run explicitly; never part of migrations.
INSERT INTO public.recipes (id, title, ingredients, instructions)
VALUES (
    '00000000-0000-4000-8000-000000000001',
    'Scrambled eggs',
    '[{"name":"eggs","quantity":"2","unit":""}]'::jsonb,
    ARRAY['Beat the eggs.', 'Cook gently in a pan, stirring.']
)
ON CONFLICT (id) DO NOTHING;
