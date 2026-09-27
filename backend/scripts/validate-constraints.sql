-- Validate every NOT VALID constraint that the current data already satisfies.
-- Constraints whose data still violates them stay NOT VALID (reported as errors)
-- so validation is always safe to re-run. Applied via:
--   Get-Content scripts/validate-constraints.sql | docker exec -i <container> psql -U postgres -d techpharma
SELECT format('ALTER TABLE %s VALIDATE CONSTRAINT %I', conrelid::regclass, conname)
FROM pg_constraint
WHERE NOT convalidated
ORDER BY conrelid::regclass::text, conname;
\gexec

-- Report: anything still unvalidated (and why it could not be validated).
SELECT conrelid::regclass AS tbl, conname, convalidated
FROM pg_constraint
WHERE NOT convalidated
ORDER BY 1, 2;
