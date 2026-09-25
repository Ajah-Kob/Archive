-- =============================================================================
-- Migration: 20260925000001_section_academic_year
-- Subtask: section-creation-move-02 — Stage Section schema migration and
--   academic-year backfill.
-- Companion (read-only): preflight.sql + PREFLIGHT_GATE.md in this folder.
-- =============================================================================
-- Purpose:
--   1. Make "Section"."coordinatorId" nullable (new sections start unassigned;
--      assigned sections keep their coordinator). The FK
--      "Section_coordinatorId_fkey" (REFERENCES "Coordinator"("id")
--      ON DELETE RESTRICT ON UPDATE CASCADE) is preserved as-is; only the
--      NOT NULL constraint is dropped. Student.sectionId and Group.sectionId
--      FKs reference "Section"("id") and are untouched.
--   2. Add required "Section"."academicYear" via a staged
--      nullable -> backfill ('2026-2027') -> NOT NULL sequence so no existing
--      row is lost and no placeholder NULL survives.
--   3. Replace the coordinator-scoped uniqueness
--      ("Section_coordinatorId_section_key" ON ("coordinatorId", "section"))
--      with an active-only normalized per-year unique index:
--      UNIQUE ("academicYear", normalized("section")) WHERE "deletedAt" IS NULL.
--      Archived/deleted names stay reusable by design.
--
-- Normalization (must match preflight.sql and the application layer):
--   lower(collapse(trim("section")))
--   = lower(regexp_replace(regexp_replace("section", '^\s+|\s+$', '', 'g'),
--                                          '\s+', ' ', 'g'))
--   = JS: name.trim().replace(/\s+/g, ' ').toLowerCase()
-- Legacy academic year for ALL pre-existing rows: '2026-2027' (exact).
-- Application duplicate error copy (exact):
--   'This name is taken by an active section.'
--
-- Safety / gate:
--   - Run preflight.sql first and require Q5 = PASS with Q2 = 0 rows and Q3
--     triaged per PREFLIGHT_GATE.md before deploying this file.
--   - The DO block below re-enforces that gate INSIDE the migration
--     transaction: any unresolved active normalized collision aborts the
--     migration with an exception before any DDL runs. It never renames,
--     reassigns, archives, or deletes business data.
--   - Do NOT run against live Neon without approval. Apply first to a
--     disposable/staging database, then verify via the checks in § Verification.
--   - Prisma note: the partial expression unique index below is a DB-only
--     constraint. Prisma schema.prisma cannot express partial/expression
--     indexes, so `prisma validate` / `prisma generate` will show
--     Section.academicYear (required String) and Section.coordinatorId
--     (optional Int) without rendering this index. The application layer must
--     still preflight duplicates (see subtask 03+) and surface the exact copy
--     above; the index is the final backstop.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Gate: refuse when the preflight finds unresolved active duplicates.
-- Models every existing ACTIVE row under the legacy year '2026-2027' and
-- aborts if two or more normalize to the same name. Runs before any DDL so
-- a BLOCKED state leaves the database untouched. Resolve manually per
-- PREFLIGHT_GATE.md (rename or archive with Program Chair + coordinator
-- sign-off), re-run preflight.sql, then re-attempt this migration.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  collision_groups INTEGER;
BEGIN
  SELECT COUNT(*) INTO collision_groups FROM (
    SELECT lower(
      regexp_replace(
        regexp_replace(s."section", '^\s+|\s+$', '', 'g'),
        '\s+', ' ', 'g'
      )
    ) AS normalized_name
    FROM "Section" s
    WHERE s."deletedAt" IS NULL
    GROUP BY 1
    HAVING COUNT(*) > 1
  ) AS collisions;
  IF collision_groups > 0 THEN
    RAISE EXCEPTION 'Migration 20260925000001_section_academic_year BLOCKED: % active normalized duplicate group(s) under academic year 2026-2027. Resolve per PREFLIGHT_GATE.md and re-run preflight.sql before applying. Application error copy: This name is taken by an active section.', collision_groups;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Step 1: Add "academicYear" as nullable (staged; NOT NULL comes after backfill).
-- ---------------------------------------------------------------------------
ALTER TABLE "Section" ADD COLUMN "academicYear" TEXT;

-- ---------------------------------------------------------------------------
-- Step 2: Backfill every existing row to the exact legacy year '2026-2027'.
-- No row is renamed; only the new column is populated.
-- ---------------------------------------------------------------------------
UPDATE "Section" SET "academicYear" = '2026-2027' WHERE "academicYear" IS NULL;

-- ---------------------------------------------------------------------------
-- Step 3: Enforce required academicYear. Fails if any NULL survives (e.g. a
-- concurrent insert slipped in), which is intentional — investigate rather
-- than defaulting silently.
-- ---------------------------------------------------------------------------
ALTER TABLE "Section" ALTER COLUMN "academicYear" SET NOT NULL;

-- ---------------------------------------------------------------------------
-- Step 4: Make "coordinatorId" nullable. New sections are created unassigned
-- (NULL); existing assignments are preserved. The FK constraint
-- "Section_coordinatorId_fkey" is unchanged (RESTRICT on delete), so dropping
-- a coordinator row still cannot silently orphan a section — assignment
-- changes go through the deliberate assign flow. Student/Group FKs are
-- unaffected (they reference "Section"("id)").
-- ---------------------------------------------------------------------------
ALTER TABLE "Section" ALTER COLUMN "coordinatorId" DROP NOT NULL;

-- ---------------------------------------------------------------------------
-- Step 5: Remove the old coordinator-scoped uniqueness. Coordinators may own
-- many sections and global name uniqueness never depends on coordinator.
-- ---------------------------------------------------------------------------
DROP INDEX IF EXISTS "Section_coordinatorId_section_key";

-- ---------------------------------------------------------------------------
-- Step 6: Active-only normalized per-year uniqueness (DB backstop).
-- Rejects an active row whose (academicYear, normalized section) duplicates
-- another active row; archived/deleted rows (WHERE clause) are ignored so
-- their names are reusable. Expression matches preflight.sql Q1/Q2/Q5.
-- ---------------------------------------------------------------------------
CREATE UNIQUE INDEX "Section_active_section_academicYear_key"
  ON "Section" (
    "academicYear",
    (lower(
      regexp_replace(
        regexp_replace("section", '^\s+|\s+$', '', 'g'),
        '\s+', ' ', 'g'
      )
    ))
  )
  WHERE "deletedAt" IS NULL;

-- =============================================================================
-- Verification (run against the disposable/staging database AFTER deploy;
-- SELECT-only, no business-data mutation):
--
--   -- Nullability + backfill + FKs:
--   SELECT column_name, is_nullable, data_type
--   FROM information_schema.columns
--   WHERE table_name = 'Section'
--     AND column_name IN ('coordinatorId', 'academicYear', 'section', 'deletedAt')
--   ORDER BY column_name;
--   -- Expect: coordinatorId = YES, academicYear = NO.
--   SELECT "academicYear", COUNT(*) FROM "Section" GROUP BY 1;
--   -- Expect: every row = '2026-2027' (plus any staging-only test rows).
--   SELECT COUNT(*) AS null_years FROM "Section" WHERE "academicYear" IS NULL;
--   -- Expect: 0.
--   SELECT conname, contype FROM pg_constraint WHERE conrelid = '"Section"'::regclass;
--   -- Expect: "Section_coordinatorId_fkey" still present (RESTRICT).
--
--   -- Indexes:
--   SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'Section';
--   -- Expect: "Section_coordinatorId_section_key" absent,
--   --   "Section_active_section_academicYear_key" present with
--   --   WHERE "deletedAt" IS NULL.
--
--   -- Behavior: active normalized duplicate in the same year is rejected;
--   -- archived/deleted matching name is accepted (run in a transaction and
--   -- roll back so the staging DB stays clean):
--   --   BEGIN;
--   --   -- duplicate of a live (name, 2026-2027) pair -> must raise
--   --   -- unique violation on "Section_active_section_academicYear_key".
--   --   -- archived copy of the same name -> must succeed.
--   --   ROLLBACK;
-- =============================================================================

-- =============================================================================
-- Rollback / recovery (NOT auto-applied; manual, tested order matters).
-- Prisma has no down migrations — run these deliberately, in a transaction,
-- against the same database the migration was applied to. Never bulk-delete.
--
--   BEGIN;
--   -- 1. Drop the new active-only unique index:
--   DROP INDEX IF EXISTS "Section_active_section_academicYear_key";
--
--   -- 2. Restore the old coordinator-scoped uniqueness ONLY if it is safe:
--   --    fails when NULL coordinatorIds or cross-coordinator duplicate names
--   --    exist (expected after unassigned sections are created). Triage those
--   --    rows first (assign or archive deliberately), then:
--   -- CREATE UNIQUE INDEX "Section_coordinatorId_section_key"
--   --   ON "Section"("coordinatorId", "section");
--
--   -- 3. Re-require a coordinator ONLY if no unassigned sections exist:
--   --    SELECT COUNT(*) FROM "Section" WHERE "coordinatorId" IS NULL;
--   --    -- must be 0, else STOP and triage.
--   -- ALTER TABLE "Section" ALTER COLUMN "coordinatorId" SET NOT NULL;
--
--   -- 4. Drop academicYear only if the product agrees to lose the identity
--   --    column (data loss for any post-migration years). Prefer keeping the
--   --    column nullable instead of dropping:
--   -- ALTER TABLE "Section" ALTER COLUMN "academicYear" DROP NOT NULL;
--   -- -- or, destructively:
--   -- -- ALTER TABLE "Section" DROP COLUMN "academicYear";
--   COMMIT;
--
-- Recovery notes:
--   - If the migration aborted in the gate DO block, nothing was applied;
--     fix duplicates per PREFLIGHT_GATE.md and retry — no rollback needed.
--   - If it failed between ADD COLUMN and SET NOT NULL, re-run the backfill
--     UPDATE for any remaining NULLs, then retry SET NOT NULL.
--   - Student/Group rows are never touched by this migration, so no
--     reassignment recovery is needed for them.
-- =============================================================================
