# Archived Plan: Section Activity Feed (Faculty Overview)

**Status:** Archived — Analysis complete, not implemented (2026-09-29)
**Owner:** User request following the faculty defense resubmission tab refactor
**Related:** `/faculty/my-sections/[sectionId]/overview` (target) · `lib/actions/audit.ts` `AuditLog` · `components/defense/ResubmissionActivityFeed.tsx` (the panelist-scoped feed this mirrors) · `lib/defense/session-helpers.ts` `deriveResubmissionActivity`
**Branch:** None (archived before implementation)

---

## 1. Goal

An activity feed on the section **Overview** tab, scoped to that section only, so a
coordinator can see what has happened in their section without reading every tab.

Deliberately mirrors the pattern just built for the faculty resubmission tab: a
read-only timeline, never a progress tracker, never "waiting on someone else".

---

## 2. Key Finding — the audit gap is exactly the feed's content

156 exported async functions in `lib/actions/`. **75 mutate data. 31 are audited.
44 are not.** The unaudited set is disproportionately the section-visible
lifecycle events, which is what a section feed is made of.

### Already audited (section-scoped)

| Action | Source |
|---|---|
| `SECTION_CREATE` | `sections.ts:1191` |
| `SECTION_UPDATE` ×3 | `sections.ts:1308, 1361, 1394` |
| `SECTION_ARCHIVE` | `sections.ts:1478` |
| `SECTION_COORDINATOR_REASSIGN` | `sections.ts:1698` |
| `GROUP_JOIN` | `sections.ts:488` (filed as `entity: 'SECTION'`) |
| `COORDINATOR_ASSIGN` | `coordinator.ts:151` |

### Mutating but NOT audited — the gaps

| Model | Unaudited actions |
|---|---|
| **group** | `renameGroup`, `inviteGroupMembers`, `cancelGroupInvitation`, `sendAdviserInvitation`, `cancelAdviserInvitation`, `removeStudentFromSection`, `removeStudentsFromSection` |
| **student** | `acceptInvitation`, `removeStudentFromSection`, `removeStudentsFromSection` |
| **section** | `assignSectionCoordinator`, `setPhaseAvailability`, `setMilestoneAvailability`, `copySectionJoinCode` |
| **adviser / faculty** | `removeFaculty` (cascades adviser + coordinator removal), `joinFacultyWithCode` |
| **defenseSubmission** | `submitDefenseDocument`, `resubmitDefenseDocument`, `replaceDefenseDocument` |
| **defenseSubmissionReview** | `reviewDefenseResubmission` |
| **topic / capstone** | `saveFinalTopic` |
| **invitation** | `inviteGroupMembers`, `cancelGroupInvitation`, `sendAdviserInvitation`, `cancelAdviserInvitation`, `acceptInvitation` |
| **chapter** | `requestChapterUploadToken` (via `milestone` / `milestoneSubmission`) |

### Deliberately NOT to be audited (noise)

`markNotificationRead`, `markAllNotificationsRead`, `favoriteArchive`,
`unfavoriteArchive`, `saveAnnotationDraft` (fires on a burst of keystrokes),
`resetPassword`. A section feed showing these is worse than empty.

So "audit everything" means **all section-visible business events** (~25-30
actions), not all 44.

---

## 3. Options Considered

### Option A — derive from domain tables (read-model)

Read Groups, Students, Capstone submissions, DefenseSchedules for the section and
merge by timestamp. All domain tables have `createdAt` / `updatedAt` / `deletedAt`.

- **Covers:** creation, joining, archiving, submissions, schedules, verdicts —
  including the unaudited gaps, for free, with zero migration.
- **Cannot cover:** any in-place edit. `updatedAt` says *when it last changed*,
  never *what changed or by whom*. Adviser reassignment, group rename, schedule
  reschedule, verdict overwrite are permanently invisible. `AuditLog` stores
  `before`/`after` precisely for this; a read-model discards it.
- **Not extensible:** adopting `AuditLog` later still means retrofitting
  `sectionId` across every call site.

### Option B — enhance `AuditLog` (chosen)

- **Covers** everything, including in-place edits, with actor and before/after.
- Requires a migration (see below).

**Decision: Option B.**

---

## 4. The Blocker — `AuditLog` has no `sectionId`

```prisma
model AuditLog {
  id, actorId, actorName, actorEmail, actorRole,
  action, entity, entityId, entityName,
  before, after, ip, createdAt
  @@index([createdAt]) @@index([actorId]) @@index([action]) @@index([entity])
}
```

A section feed cannot query "activities for section 4" — it would have to filter
`entityId` strings, which only resolve for rows whose `entity` is `SECTION`.
A `GROUP_CREATE` log has no link back to its section at all.

**Resolution:** add a nullable, indexed `sectionId Int?`. Additive, so no existing
row breaks. `audit()` gains a `sectionId` input, auto-resolved where the calling
action already knows its section.

---

## 5. Implementation Phases

### Phase 1 — Foundation
1. Migration: `AuditLog` += `sectionId Int?`, `@@index([sectionId, createdAt])`.
2. Extend `AuditInput` with `sectionId`; write it in `audit()`.
3. Auto-resolve `sectionId` for actions that already load a section/group
   (avoid making every call site look it up by hand).
4. **No backfill.** Old rows get `sectionId: null` and are excluded from the feed.

### Phase 2 — Close the section gaps (~20-25 actions)
Students joining/leaving · groups created/renamed/dissolved · advisers
assigned/removed · coordinator changes · invitations sent/accepted/cancelled ·
topic selected · phase and milestone availability toggled · defense documents
submitted/resubmitted/replaced · resubmission verdicts.

### Phase 3 — Feed UI on `/faculty/my-sections/[sectionId]/overview`
New `getSectionActivityFeed(sectionId)` in `lib/actions/`:
- `use cache` + `cacheTag('audit')`, newest-first, paginated
- Reuse `ResubmissionActivityFeed`'s visual language (distinct timeline, icon per
  event type, actor + action + timestamp) but scoped to the section
- Do **not** reuse `deriveResubmissionActivity` — different entity, and that one
  intentionally dedupes carried-forward reviews

### Phase 4 — Validate
`tsc`, lint, full test suite, then click-through: invite→accept shows "X joined",
adviser change shows old→new, group rename shows the rename.

---

## 6. Open Questions (answered before implementation)

1. **Backfill history?** Rows predating `sectionId` cannot be attributed. Feed
   starts empty on day one. → *Proposed: no backfill; start clean.*
2. **Retention?** Unbounded growth over a year. → *Proposed: keep everything (fits
   a capstone system's scale), revisit only if volume becomes a problem.*
3. **Visibility — coordinator only, or everyone on the section?**
   → *Unanswered; needs a decision.*

---

## 7. Notes / Traps

- `audit()` never throws — failures are swallowed so the business mutation's
  result survives. A feed can therefore silently miss rows if a write fails.
  Worth a one-line `console.error` rather than a bare `return` when this feed
  depends on completeness.
- `getAuditLogs` is **admin-only** (`requireAdmin`). The section feed needs a
  different, coordinator-scoped reader — reusing the admin reader would leak the
  whole audit table.
- `GROUP_JOIN` is recorded with `entity: 'SECTION'`, which breaks any naive
  `entity ===` grouping.
- Actor identity is denormalized onto the row (`actorName`/`actorEmail`), so
  renames do not rewrite history — keep it that way.
