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

COMMIT;
