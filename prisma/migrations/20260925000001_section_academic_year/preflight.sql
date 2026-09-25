-- =============================================================================
-- Section identity preflight (subtask 01)
-- Migration folder: prisma/migrations/20260925000001_section_academic_year/
-- File: preflight.sql (read-only; no DDL / DML)
-- =============================================================================
-- Purpose:
--   Inspect existing Section data BEFORE any schema change (nullable
--   coordinatorId, required academicYear, per-year normalized uniqueness).
--   Models every existing row under the legacy academic year '2026-2027' and
--   surfaces (a) active normalized-name collisions that BLOCK the new unique
--   index, and (b) coordinator/faculty/user relation anomalies to triage
--   separately. Archived/deleted rows are excluded from the active uniqueness
--   set: their names are reusable by design.
--
-- Safety:
--   SELECT-only. No CREATE/ALTER/UPDATE/DELETE/INSERT, no temp tables, no
--   session mutations. Repeatable: re-running returns current truth. Safe to
--   run against Neon. Prefer the direct (unpooled) connection and, when
--   available, a read-only role or a snapshot/clone for extra caution.
--
-- Usage (PowerShell):
--   psql $env:DATABASE_URL_UNPOOLED -v ON_ERROR_STOP=1 `
--     -f prisma/migrations/20260925000001_section_academic_year/preflight.sql
--
-- Normalization rule (must match the application layer):
--   lower(collapse(trim(section)))  i.e.
--   lower(regexp_replace(regexp_replace(section, '^\s+|\s+$', '', 'g'),
--                                        '\s+', ' ', 'g'))
--   This is case-insensitive AND whitespace-normalized (leading/trailing
--   whitespace removed, internal runs collapsed to one space). It matches the
--   planned JS check: name.trim().replace(/\s+/g, ' ').toLowerCase().
--   Legacy academic year for ALL existing rows: '2026-2027'.
--
-- Gate rule:
--   active_collision_groups MUST be 0 before subtask 02 may create the new
--   unique index. Any collision is resolved MANUALLY (rename or archive with
--   coordinator/chair sign-off) — never by automatic rename or deletion.
--   Relation anomalies are triaged separately per PREFLIGHT_GATE.md.
--   Application duplicate error copy: 'This name is taken by an active section.'
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Q0. Scope sanity: total vs active vs archived sections.
-- Expect: archived rows exist only as reusable history; active rows are the
-- migration surface. Legacy year is a constant for every existing row.
-- ---------------------------------------------------------------------------
SELECT
  COUNT(*) AS total_sections,
  COUNT(*) FILTER (WHERE s."deletedAt" IS NULL) AS active_sections,
  COUNT(*) FILTER (WHERE s."deletedAt" IS NOT NULL) AS archived_sections,
  '2026-2027'::text AS legacy_academic_year
FROM "Section" s;

-- ---------------------------------------------------------------------------
-- Q1. Active normalized groups under 2026-2027 (full audit list).
-- Groups every ACTIVE section by (normalized name + academic year).
-- Rows with uniqueness_status = 'COLLISION' are migration blockers.
-- ---------------------------------------------------------------------------
WITH active_sections AS (
  SELECT
    s."id",
    s."section",
    s."coordinatorId",
    lower(
      regexp_replace(
        regexp_replace(s."section", '^\s+|\s+$', '', 'g'),
        '\s+', ' ', 'g'
      )
    ) AS normalized_name
  FROM "Section" s
  WHERE s."deletedAt" IS NULL
)
SELECT
  normalized_name AS normalized_section,
  '2026-2027'::text AS "academicYear",
  COUNT(*) AS active_rows,
  COUNT(DISTINCT "coordinatorId") AS distinct_coordinators,
  CASE WHEN COUNT(*) > 1 THEN 'COLLISION' ELSE 'unique' END AS uniqueness_status,
  array_agg("id" ORDER BY "id") AS section_ids,
  array_agg("section" ORDER BY "id") AS raw_names
FROM active_sections
GROUP BY 1
ORDER BY active_rows DESC, normalized_section;

-- ---------------------------------------------------------------------------
-- Q2. Blocker detail: every ACTIVE row participating in a collision.
-- Empty result = gate criterion satisfied. Non-empty = STOP, resolve each
-- normalized group manually per PREFLIGHT_GATE.md, then re-run this file.
-- Liveness flags give context but do NOT move the row out of the blocker set.
-- ---------------------------------------------------------------------------
WITH active_sections AS (
  SELECT
    s."id",
    lower(
      regexp_replace(
        regexp_replace(s."section", '^\s+|\s+$', '', 'g'),
        '\s+', ' ', 'g'
      )
    ) AS normalized_name
  FROM "Section" s
  WHERE s."deletedAt" IS NULL
),
colliding AS (
  SELECT normalized_name
  FROM active_sections
  GROUP BY 1
  HAVING COUNT(*) > 1
)
SELECT
  a.normalized_name AS normalized_section,
  '2026-2027'::text AS "academicYear",
  s."id" AS section_id,
  s."section" AS raw_name,
  s."coordinatorId" AS coordinator_id,
  s."createdAt" AS created_at,
  (c."id" IS NULL) AS coordinator_row_missing,
  (c."deletedAt" IS NOT NULL) AS coordinator_soft_deleted,
  (f."deletedAt" IS NOT NULL) AS faculty_soft_deleted,
  (u."deletedAt" IS NOT NULL) AS user_soft_deleted
FROM active_sections a
JOIN "Section" s ON s."id" = a."id"
JOIN colliding k ON k.normalized_name = a.normalized_name
LEFT JOIN "Coordinator" c ON c."id" = s."coordinatorId"
LEFT JOIN "Faculty" f ON f."id" = c."facultyId"
LEFT JOIN "User" u ON u."id" = f."userId"
ORDER BY a.normalized_name, s."id";

-- ---------------------------------------------------------------------------
-- Q3. Relation / data anomalies on ACTIVE sections (triage separately).
-- Covers: missing or soft-deleted coordinator/faculty/user links, and empty
-- or whitespace-only names. These rows stay in the active set for Q1/Q2;
-- this query only adds the diagnosis so each can be reassigned, restored, or
-- archived deliberately. It never renames or deletes anything.
-- ---------------------------------------------------------------------------
SELECT
  s."id" AS section_id,
  s."section" AS raw_name,
  lower(
    regexp_replace(
      regexp_replace(s."section", '^\s+|\s+$', '', 'g'),
      '\s+', ' ', 'g'
    )
  ) AS normalized_section,
  '2026-2027'::text AS "academicYear",
  s."coordinatorId" AS coordinator_id,
  s."createdAt" AS created_at,
  (c."id" IS NULL) AS coordinator_row_missing,
  (c."deletedAt" IS NOT NULL) AS coordinator_soft_deleted,
  (f."id" IS NULL) AS faculty_row_missing,
  (f."deletedAt" IS NOT NULL) AS faculty_soft_deleted,
  (u."id" IS NULL) AS user_row_missing,
  (u."deletedAt" IS NOT NULL) AS user_soft_deleted,
  (lower(
    regexp_replace(
      regexp_replace(s."section", '^\s+|\s+$', '', 'g'),
      '\s+', ' ', 'g'
    )
  ) = '') AS name_empty_after_normalization,
  CASE
    WHEN c."id" IS NULL THEN 'coordinator row missing: reassign or archive deliberately'
    WHEN c."deletedAt" IS NOT NULL THEN 'coordinator soft-deleted: restore, reassign, or archive deliberately'
    WHEN f."id" IS NULL THEN 'faculty row missing: restore linkage or archive deliberately'
    WHEN f."deletedAt" IS NOT NULL THEN 'faculty soft-deleted: restore, reassign, or archive deliberately'
    WHEN u."id" IS NULL THEN 'user row missing: restore linkage or archive deliberately'
    WHEN u."deletedAt" IS NOT NULL THEN 'user soft-deleted: restore, reassign, or archive deliberately'
    WHEN lower(
      regexp_replace(
        regexp_replace(s."section", '^\s+|\s+$', '', 'g'),
        '\s+', ' ', 'g'
      )
    ) = '' THEN 'name empty after normalization: rename or archive deliberately'
    ELSE 'unspecified anomaly: inspect manually'
  END AS triage_diagnosis
FROM "Section" s
LEFT JOIN "Coordinator" c ON c."id" = s."coordinatorId"
LEFT JOIN "Faculty" f ON f."id" = c."facultyId"
LEFT JOIN "User" u ON u."id" = f."userId"
WHERE s."deletedAt" IS NULL
  AND (
    c."id" IS NULL
    OR c."deletedAt" IS NOT NULL
    OR f."id" IS NULL
    OR f."deletedAt" IS NOT NULL
    OR u."id" IS NULL
    OR u."deletedAt" IS NOT NULL
    OR lower(
      regexp_replace(
        regexp_replace(s."section", '^\s+|\s+$', '', 'g'),
        '\s+', ' ', 'g'
      )
    ) = ''
  )
ORDER BY s."id";

-- ---------------------------------------------------------------------------
-- Q4. Archived / deleted inventory (informational, NOT blockers).
-- Archived names are reusable by design and MUST NOT block the new index.
-- Q4b lists archived names that overlap an active name to make the reuse
-- rule auditable: overlap here is expected and allowed.
-- ---------------------------------------------------------------------------
-- Q4a: archived groups under 2026-2027.
WITH archived_sections AS (
  SELECT
    lower(
      regexp_replace(
        regexp_replace(s."section", '^\s+|\s+$', '', 'g'),
        '\s+', ' ', 'g'
      )
    ) AS normalized_name
  FROM "Section" s
  WHERE s."deletedAt" IS NOT NULL
)
SELECT
  normalized_name AS normalized_section,
  '2026-2027'::text AS "academicYear",
  COUNT(*) AS archived_rows
FROM archived_sections
GROUP BY 1
ORDER BY archived_rows DESC, normalized_section;

-- Q4b: archived names overlapping an active name (allowed reuse, not a blocker).
WITH active_names AS (
  SELECT DISTINCT lower(
    regexp_replace(
      regexp_replace(s."section", '^\s+|\s+$', '', 'g'),
      '\s+', ' ', 'g'
    )
  ) AS normalized_name
  FROM "Section" s
  WHERE s."deletedAt" IS NULL
),
archived_names AS (
  SELECT DISTINCT lower(
    regexp_replace(
      regexp_replace(s."section", '^\s+|\s+$', '', 'g'),
      '\s+', ' ', 'g'
    )
  ) AS normalized_name
  FROM "Section" s
  WHERE s."deletedAt" IS NOT NULL
)
SELECT
  a.normalized_name AS normalized_section,
  '2026-2027'::text AS "academicYear",
  'reusable-archived-overlap'::text AS note
FROM archived_names a
JOIN active_names n ON n.normalized_name = a.normalized_name
ORDER BY 1;

-- ---------------------------------------------------------------------------
-- Q5. Migration gate: single-row PASS / BLOCKED verdict.
-- BLOCKED when active_collision_groups > 0: do NOT apply the new unique
-- index; resolve per PREFLIGHT_GATE.md and re-run this preflight.
-- PASS still requires triaging any relation_anomaly_rows before subtask 02
-- makes coordinatorId nullable (orphans need a deliberate new home).
-- ---------------------------------------------------------------------------
WITH active_sections AS (
  SELECT
    s."id",
    s."coordinatorId",
    lower(
      regexp_replace(
        regexp_replace(s."section", '^\s+|\s+$', '', 'g'),
        '\s+', ' ', 'g'
      )
    ) AS normalized_name
  FROM "Section" s
  WHERE s."deletedAt" IS NULL
),
collision_groups AS (
  SELECT normalized_name
  FROM active_sections
  GROUP BY 1
  HAVING COUNT(*) > 1
),
anomaly_rows AS (
  SELECT s."id"
  FROM "Section" s
  LEFT JOIN "Coordinator" c ON c."id" = s."coordinatorId"
  LEFT JOIN "Faculty" f ON f."id" = c."facultyId"
  LEFT JOIN "User" u ON u."id" = f."userId"
  WHERE s."deletedAt" IS NULL
    AND (
      c."id" IS NULL
      OR c."deletedAt" IS NOT NULL
      OR f."id" IS NULL
      OR f."deletedAt" IS NOT NULL
      OR u."id" IS NULL
      OR u."deletedAt" IS NOT NULL
      OR lower(
        regexp_replace(
          regexp_replace(s."section", '^\s+|\s+$', '', 'g'),
          '\s+', ' ', 'g'
        )
      ) = ''
    )
)
SELECT
  (SELECT COUNT(*) FROM collision_groups) AS active_collision_groups,
  (SELECT COUNT(*)
     FROM active_sections a
     WHERE a.normalized_name IN (SELECT normalized_name FROM collision_groups)
  ) AS active_collision_rows,
  (SELECT COUNT(*) FROM anomaly_rows) AS relation_anomaly_rows,
  (SELECT COUNT(*) FROM "Section" WHERE "deletedAt" IS NOT NULL) AS archived_rows_excluded,
  '2026-2027'::text AS legacy_academic_year,
  CASE
    WHEN (SELECT COUNT(*) FROM collision_groups) > 0
    THEN 'BLOCKED: unresolved active collisions — do NOT apply the new unique index. Resolve per PREFLIGHT_GATE.md, then re-run preflight.'
    ELSE 'PASS: no active collisions under 2026-2027. Triage any relation anomalies per PREFLIGHT_GATE.md before subtask 02.'
  END AS migration_gate;

-- End of preflight. No writes were performed.
