-- Roles are cluster-wide, so another local database may already have this role.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'recipe_api') THEN
        CREATE ROLE recipe_api LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE
            NOINHERIT NOREPLICATION NOBYPASSRLS;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'recipe_api'
        AND (rolsuper OR rolcreatedb OR rolcreaterole OR rolreplication OR rolbypassrls))
       OR EXISTS (SELECT 1 FROM pg_auth_members
                  WHERE member = 'recipe_api'::regrole) THEN
        RAISE EXCEPTION 'Existing recipe_api role has elevated privileges or memberships';
    END IF;
END;
$$;

GRANT USAGE ON SCHEMA public TO recipe_api;
GRANT SELECT ON public.recipes TO recipe_api;
CREATE POLICY recipe_api_read ON public.recipes
    FOR SELECT TO recipe_api USING (true);

-- Keep credentials out of migrations. Provision the login password separately.
ALTER ROLE recipe_api SET statement_timeout = '5s';
