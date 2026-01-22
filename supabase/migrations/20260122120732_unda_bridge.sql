-- -- 1. Setup the Connection
-- CREATE EXTENSION IF NOT EXISTS postgres_fdw;
-- CREATE SCHEMA IF NOT EXISTS unda_project_schema;

-- -- 2. Define the Remote Server (The Map)
-- CREATE SERVER unda_server
-- FOREIGN DATA WRAPPER postgres_fdw
-- OPTIONS (host 'zpmyjmzvgmohyqhprqmr.supabase.co', port '5432', dbname 'postgres');

-- -- 3. Provide the Credentials (The Key)
-- CREATE USER MAPPING FOR postgres
-- SERVER unda_server
-- OPTIONS (user 'postgres', password 'fbca1d9e28b945f984b84560dea34edc');

-- -- 4. Map the Foreign Table
-- -- We only map the columns we need to protect and display
-- CREATE FOREIGN TABLE IF NOT EXISTS unda_project_schema.accounts (
--   id int,
--   p_id int,
--   balance decimal,
--   idata jsonb -- This holds the owner_id
-- )
-- SERVER unda_server
-- OPTIONS (schema_name 'public', table_name 'accounts');

-- -- 5. THE SECURITY MIGRATION: The Secure View
-- -- This is where the magic happens.
-- CREATE OR REPLACE VIEW public.my_unda_accounts AS
-- SELECT 
--     id,
--     balance,
--     (idata->>'owner_id')::uuid as owner_id
-- FROM unda_project_schema.accounts
-- WHERE p_id = 23 -- Isolates YOUR project's data in Unda
-- AND (idata->>'owner_id')::uuid = auth.uid(); -- The "Privacy Guard"

-- -- 6. Grant Access
-- GRANT SELECT ON public.my_unda_accounts TO authenticated;