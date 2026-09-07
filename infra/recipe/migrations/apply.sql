\set ON_ERROR_STOP on

BEGIN;
-- Serialize local migration runs, including creation of the version ledger.
SELECT pg_advisory_xact_lock(726563697065);

CREATE TABLE IF NOT EXISTS public.schema_migrations (
    version text PRIMARY KEY,
    applied_at timestamptz NOT NULL DEFAULT now()
);

SELECT NOT EXISTS (
    SELECT 1 FROM public.schema_migrations WHERE version = '0001_initial'
) AS apply_0001 \gset

\if :apply_0001
    \ir 0001_initial.sql
    INSERT INTO public.schema_migrations (version) VALUES ('0001_initial');
\else
    \echo '0001_initial already applied'
\endif

SELECT NOT EXISTS (
    SELECT 1 FROM public.schema_migrations WHERE version = '0002_recipe_api_reader'
) AS apply_0002 \gset

\if :apply_0002
    \ir 0002_recipe_api_reader.sql
    INSERT INTO public.schema_migrations (version) VALUES ('0002_recipe_api_reader');
\else
    \echo '0002_recipe_api_reader already applied'
\endif

SELECT NOT EXISTS (
    SELECT 1 FROM public.schema_migrations WHERE version = '0003_recipe_api_create'
) AS apply_0003 \gset

\if :apply_0003
    \ir 0003_recipe_api_create.sql
    INSERT INTO public.schema_migrations (version) VALUES ('0003_recipe_api_create');
\else
    \echo '0003_recipe_api_create already applied'
\endif

SELECT NOT EXISTS (
    SELECT 1 FROM public.schema_migrations WHERE version = '0004_recipe_api_update'
) AS apply_0004 \gset

\if :apply_0004
    \ir 0004_recipe_api_update.sql
    INSERT INTO public.schema_migrations (version) VALUES ('0004_recipe_api_update');
\else
    \echo '0004_recipe_api_update already applied'
\endif

SELECT NOT EXISTS (
    SELECT 1 FROM public.schema_migrations WHERE version = '0005_recipe_api_delete'
) AS apply_0005 \gset

\if :apply_0005
    \ir 0005_recipe_api_delete.sql
    INSERT INTO public.schema_migrations (version) VALUES ('0005_recipe_api_delete');
\else
    \echo '0005_recipe_api_delete already applied'
\endif

COMMIT;
