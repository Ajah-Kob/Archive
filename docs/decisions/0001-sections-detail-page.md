# ADR-0001: Sections detail page (`/sections/:slug`)

- **Status:** Accepted
- **Date:** 2026-08-03
- **Deciders:** PG (product owner) + AI pair

## Context

The `/sections` page (renamed from `/coordinator`, ADR-0000) was a read-only
monitor surface listing sections with a coordinator, name, date created,
student count, and group count. There was no drill-down into a section, and
the row action menu contained a placeholder `Remove Section` entry.

The program chair needs to monitor individual sections: which students are
enrolled, whether they are grouped, and how recently they have been active.

## Decision

1. **Slug-based route.** `/sections/:slug` where slug = lowercase section
   name with non-alphanumerics replaced by dashes (`BSIS 4AG1` →
   `bsis-4ag1`). Lookup is case-insensitive (`mode: 'insensitive'`) because a
   slug cannot carry case.
2. **Uniqueness.** `Section.section` becomes `@unique`, applied via
   `prisma db push` (no migration file). A pre-push query confirmed no
   duplicate names exist in the database.
3. **PG stays read-only on the detail page.** Move Section / Remove Students
   actions are NOT implemented. Their semantics are recorded below for the
   future coordinator page (`/my-sections`).
4. **Detail page composition:** back-to-sections button, breadcrumb
   `ARCHIVE › Sections › {name}`, h1 + subtitle, then a students table with
   search + group filter + sort (Student/Activity).
5. **List page:** adopts the faculty table grid (`2fr_1fr_1fr_1fr_1fr_150px`),
   sortable headers (Section/Students/Groups), and a single `View Details`
   action. No search/filter on the list — section counts are small.
6. **Students table:** grid `2fr_1fr_1fr` (Student / Activity / Group), no
   actions column. Activity = last login via the shared `ActivityStatus`
   component ("Active now" within 5 min, else `timeAgo`, else "Never").
   Group cell shows `{groupName} · {memberCount}` with a muted "No group"
   state.
7. **Caching:** `getSectionDetailData` is `'use cache'`, tagged
   `section-${slug}` + `cacheLife('max')`, wrapped by `getSectionBySlug`
   behind a session guard. Bad slug → `notFound()`.

## Deferred semantics (future coordinator page)

- **Move Section:** reassign a student to another active section. Because
  `Group` is section-agnostic in the schema, moving a grouped student is
  allowed, but the confirmation must warn when the student's group will span
  sections.
- **Remove Students:** soft-delete the `Student` row
  (`Student.deletedAt`), dropping group membership with it. The user keeps
  the `STUDENT` role but loses student access. `Student.sectionId` is
  required — there is no "unassigned" state; do NOT introduce one without a
  schema decision.
- Future mutations must `revalidateTag('sections', 'max')` AND
  `revalidateTag('section-${slug}', 'max')`.

## Consequences

- Section names can no longer be duplicated at the DB level; attempting to
  create a duplicate now fails at the unique constraint.
- The list row menu lost its `Remove Section` placeholder; section deletion
  remains out of scope.
