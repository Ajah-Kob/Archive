# Section identity preflight — migration gate and resolution notes

Scope: subtask 01 only (`section-creation-move-01`). No schema change is made
here. This gate decides whether subtask 02 may stage the Section migration
(nullable `coordinatorId`, required `academicYear`, per-year normalized
uniqueness). Companion query file: `preflight.sql` in this same folder.

## 1. What this gate protects

- New sections start unassigned; existing rows backfill to `2026-2027`.
- Active names are unique per academic year, case-insensitive and
  whitespace-normalized; archived/deleted names are reusable.
- Coordinators may own many sections; uniqueness never depends on coordinator.
- Duplicate application copy (exact): `This name is taken by an active section.`
- Nothing here renames, reassigns, archives, or deletes business data.

## 2. Safety

- `preflight.sql` is SELECT-only: no DDL, no DML, no temp tables, no session
  writes. Repeatable against Neon.
- Prefer the direct (unpooled) connection string and stop on error:
  `psql "$DATABASE_URL_UNPOOLED" -v ON_ERROR_STOP=1 -f
  prisma/migrations/20260925000001_section_academic_year/preflight.sql`
- For extra caution run against a snapshot/clone or with a read-only role.
- This folder is preflight-only until subtask 02 adds `migration.sql`; do not
  treat it as a deployable Prisma migration yet.

## 3. Query map (what to look at)

| Query | Returns | Expected when healthy |
| --- | --- | --- |
| Q0 scope | total / active / archived counts | Active rows are the migration surface; archived rows are history |
| Q1 active groups | every active `(normalized name, 2026-2027)` group with `unique` / `COLLISION` | All rows `unique` |
| Q2 blocker detail | each active row inside a collision, with coordinator-chain liveness | Zero rows |
| Q3 anomalies | active rows with missing/soft-deleted coordinator, faculty, or user, or empty-after-normalization names | Zero rows (or a triaged list, see §5) |
| Q4a archived groups | archived `(normalized name, 2026-2027)` groups | Informational only, never blocks |
| Q4b archived/active overlap | archived names matching an active name | Overlap is allowed reuse, never blocks |
| Q5 gate | single-row `BLOCKED` / `PASS` verdict with counts | `PASS` with `active_collision_groups = 0` |

Normalization (SQL and app must agree): trim leading/trailing whitespace,
collapse internal runs to one space, lowercase — i.e. JS
`name.trim().replace(/\s+/g, ' ').toLowerCase()`.

## 4. Gate checklist (stop on first failure)

1. Run `preflight.sql` end-to-end; confirm all six result sets return.
2. Read Q5 `migration_gate`.
   - `BLOCKED` → STOP. Do not start subtask 02. Resolve per §5, re-run.
   - `PASS` → continue to step 3.
3. Confirm Q2 returns zero rows. Any row → treat as `BLOCKED` regardless of
   how Q5 was read; resolve per §5, re-run.
4. Triage Q3 row by row per §5. Do not make `coordinatorId` nullable in
   subtask 02 while an orphan has no deliberate new home.
5. Record the run in §7, then hand off to subtask 02.

## 5. Resolution paths (manual only — never automatic)

| Situation | Resolution | Owner |
| --- | --- | --- |
| Active collision (Q2): two live sections normalize to the same name | With the coordinators and Program Chair, rename the newer/renamed section to its true distinct name, or archive the genuinely empty duplicate through the remove flow. Re-run preflight until Q2 is empty. | Program Chair + affected coordinators |
| Collision where one side's coordinator chain is dead (Q2 + Q3 overlap) | First decide the section's home: restore the coordinator linkage or reassign/archive deliberately, then resolve the name as above. | Program Chair |
| Orphaned active section (Q3): coordinator/faculty/user missing or soft-deleted | Restore the linkage, assign the intended live coordinator, or archive the section if it is truly defunct. Do not null the FK silently. | Program Chair |
| Empty-after-normalization name (Q3) | Rename to the real section name or archive if placeholder junk. | Program Chair + coordinator |
| Archived overlap (Q4b) | No action. Archived names are reusable; the future unique index covers active rows only. | — |

Never: auto-rename, auto-reassign, bulk delete, or `UPDATE` sections from the
preflight itself. Every fix is a deliberate product decision with sign-off,
audited through the normal section actions.

## 6. Handoff to subtask 02

Subtask 02 may proceed only on a recorded `PASS` with Q2 empty and Q3 triaged.
It must refuse to create the active-only normalized unique index while a
`BLOCKED` verdict stands, and must keep the staged
nullable → backfill (`2026-2027`) → `NOT NULL` sequence plus a tested
rollback for the new columns and index.

## 7. Verification record (fill per run)

- Run date / actor: 2026-09-25 / implementation agent
- Target (snapshot / clone / live Neon): live Neon via `DATABASE_URL_UNPOOLED` from `.env.local`, SELECT-only
- Q0 totals (total / active / archived): 2 / 2 / 0
- Q5 verdict (`BLOCKED` / `PASS`) + counts: `PASS`, `active_collision_groups = 0`
- Q2 rows (0 required): 0
- Q3 rows + triage decision per row: 0 rows; no triage required
- Re-run date after fixes (if any): none required
- Migration applied: 2026-09-25 via `npx prisma migrate deploy`; post-apply preflight remained `PASS`.
