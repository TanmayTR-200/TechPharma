-- Validate every NOT VALID constraint that the current data already satisfies.
-- Constraints whose data still violates them stay NOT VALID and are reported
-- below, so this script is safe to re-run.
--
-- Usage
--   psql:    psql "$DATABASE_URL" -f scripts/validate-constraints.sql
--   Supabase SQL Editor: paste and run - this file is pure SQL, no psql
--                          meta-commands.
--
-- Two deliberate choices:
--   * `connamespace = 'public'` - hosted providers (Supabase) create tables in
--     their own schemas (`realtime`, `auth`, ...). Those constraints are not
--     ours and must not be altered: touching `realtime.messages` breaks the
--     provider's own feature.
--   * `conrelid` rather than a hardcoded table list, so constraints added by
--     later migrations are picked up automatically.
--
-- convalidated = false means "enforced for NEW rows only". After this runs,
-- existing rows are checked too and the constraint is marked valid.

-- 1. Validate. Each ALTER runs independently inside a DO block: a single
--    violating row leaves that one constraint unvalidated instead of aborting
--    the whole script, and the reason is reported per constraint.
DO $$
DECLARE
  c        record;
  attempted int := 0;
  ok       int := 0;
  failed   int := 0;
BEGIN
  FOR c IN
    -- NOTE: the table alias must NOT be `c` - that is the record variable, and
    -- referencing `c.oid` in this query would resolve to the not-yet-assigned
    -- record ("record c is not assigned yet"). Alias the relation as `con`.
    SELECT con.oid,
           con.conrelid::regclass::text AS tbl,
           con.conname,
           n.nspname                  AS schema
    FROM pg_constraint con
    JOIN pg_namespace n ON n.oid = con.connamespace
    WHERE NOT con.convalidated
      AND n.nspname = 'public'
    ORDER BY 2, 3
  LOOP
    attempted := attempted + 1;
    BEGIN
      -- schema and table are passed separately so a name needing quoting (or a
      -- table whose regclass text carries a schema prefix) is still handled.
      EXECUTE format('ALTER TABLE %I.%I VALIDATE CONSTRAINT %I',
                     c.schema, c.tbl, c.conname);
      ok := ok + 1;
    EXCEPTION WHEN others THEN
      failed := failed + 1;
      RAISE NOTICE 'SKIPPED %.% : %', c.tbl, c.conname, SQLERRM;
    END;
  END LOOP;

  RAISE NOTICE 'constraints: % attempted, % validated, % still failing',
               attempted, ok, failed;
END $$;

-- 2. Report: anything still NOT VALID. Each row is a constraint that either
--    failed validation, or belongs to a table the application does not use.
--    An empty result means every constraint in `public` is now enforced for
--    existing and new rows.
SELECT conrelid::regclass AS tbl,
       conname,
       convalidated,
       pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE NOT convalidated
  AND connamespace = 'public'::regnamespace
ORDER BY 1, 2;
