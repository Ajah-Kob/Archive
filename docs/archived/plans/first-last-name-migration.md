# Archived Plan: First Name / Last Name Migration

**Status:** Archived — Not implemented in Archiving Milestone (2026-09-07)
**Owner:** User request during Archiving Milestone planning
**Related:** PROMPT.md Section 4.4 Authors (3 inputs: Lastname, Firstname, Email) + `User` model single `name` field

---

## 1. Goal
Split the current single `User.name: String` into structured `firstName` + `lastName` (and optionally `middleName`/`middleInitial`) to:
- Simplify Author selection (no need to split `User.name` into first/last for Archiving Author rows)
- Support Repository author formatting correctly (`Gutierrez, A.J.` requires last + initials)
- Support future display/search/sort by last name (e.g., `ORDER BY lastName`)
- Make signup/profile forms collect structured names

This was **requested during Archiving Milestone** but explicitly deferred: *“archive the plan for the First Name and last name. Lets focus on the archiving milestone.”*

---

## 2. Current State (as of 2026-09-07)
- `prisma/schema.prisma`:
  ```prisma
  model User {
    id        Int      @id @default(autoincrement())
    name      String   // single field, e.g., "Juan Dela Cruz"
    email     String   @unique
    // ...
  }
  ```
- `app/signup/page.tsx` + `components/forms/*` collect `name` as one input.
- `app/admin/users`, `components/faculty/*`, `components/ui/UserProfile.tsx` display `initials` via `getInitials(name)` splitting on spaces.
- **Archiving Milestone workaround (temporary):** When a student selects an existing group member via `AddStudentModal`, the code splits `user.name`:
  ```ts
  function splitName(full: string): { firstName: string; lastName: string } {
    const parts = full.trim().split(/\s+/);
    if (parts.length === 1) return { firstName: parts[0], lastName: "" };
    return { firstName: parts.slice(0, -1).join(" "), lastName: parts.at(-1)! };
  }
  ```
  This is **lossy** for middle names and compound last names (e.g., "Dela Cruz") — acceptable only until migration.

---

## 3. Desired End State
- `User`:
  ```prisma
  model User {
    firstName String
    lastName  String
    // optional: middleName String?
    // computed: name String? @ignore — or keep as `displayName` for back-compat
  }
  ```
- Signup/Profile forms: two required inputs `First Name` + `Last Name` (email unchanged).
- Seed (`prisma/seed.ts`): create users with split names.
- Display: `lastName + ", " + initials(firstName)` for Repository, `firstName + " " + lastName` elsewhere, `initials = firstName[0] + lastName[0]`.

---

## 4. Migration Steps (to execute when unarchived)
1. **Prisma schema change:**
   - Add `firstName String` and `lastName String` (nullable initially or with default).
   - Keep `name String` temporarily for back-compat.
   - `npx prisma migrate dev --name add-first-last-name`

2. **Data backfill script** (`prisma/migrations/backfill-names.ts` or one-off):
   ```ts
   // For each User where firstName is null:
   // splitName(user.name) -> update { firstName, lastName }
   // Log ambiguous cases (single word, >3 parts) for manual review
   ```

3. **Update server actions / queries:**
   - `lib/actions/user.ts` (`createUser`, `updateUser`, `getMe`, `updateMe`)
   - `lib/actions/faculty.ts`, `lib/authOptions.ts` (JWT `name` → `firstName + " " + lastName`)
   - `lib/actions/groups.ts` (Group member display)

4. **Update UI:**
   - `app/signup/page.tsx`, `app/login` not needed, `app/account/profile/page.tsx`
   - `components/forms/*`, `components/ui/UserProfile.tsx` (accept `firstName`/`lastName` + helper `formatAuthor`, `getInitials`)
   - `components/faculty/*`, `app/admin/users/page.tsx` (tables/search)
   - **Archiving `AuthorList`**: Change `AddStudentModal` to pass `firstName`/`lastName` directly instead of splitting.

5. **Validation:**
   - `firstName`/`lastName` required, `max 30 chars` each, `regex /^[A-Za-z\s\-'.]+$/`
   - Prevent blank after trim.

6. **Cleanup (follow-up PR):**
   - After all code uses `firstName`/`lastName`, deprecate `name`:
     - Option A: Keep `name` as generated column or `@@ignore` in Prisma, backfill removed.
     - Option B: Drop `name` column after confirming no references (`npx prisma migrate dev --name drop-name`).
   - Update tests (`store/usePageHeader`, `proxy.ts` role checks unchanged).

7. **Seed & docs:**
   - Update `prisma/seed.ts` (`admin@domain.com` etc.) to use split names.
   - Update `docs/03-user-roles.md`, `docs/glossary.md`.

---

## 5. Risks & Mitigations
- **Ambiguous splits** (`"Mary Jane Dela Cruz"` → first `Mary Jane`? last `Dela Cruz`?) → Manual review list; consider adding `middleName`.
- **Compound last names** lost → Could add explicit `lastName` collection on first login for existing users (prompt to confirm split).
- **Downtime** → Do additive migration (add nullable columns) so app stays up while backfilling; make required only after backfill.

---

## 6. Decision Log
- 2026-09-07: User decided to **archive** this and **focus on Archiving Milestone** with 3-input Author rows (`Lastname`, `Firstname`, `Email`) using split-name bridge.

---

## 7. Unarchive Checklist
- [ ] Create branch `feature/first-last-name`
- [ ] Apply Prisma migration + backfill
- [ ] Update forms + UserProfile + AuthorList to use structured names
- [ ] Remove `splitName` bridge from Archiving Milestone
- [ ] Update tests + run `npx tsc --noEmit` + `npx prisma generate`
- [ ] QA: signup → profile → faculty list → archiving author pick → repository display
