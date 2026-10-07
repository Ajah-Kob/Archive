# Implementation Plan: Defense System Links

**Spec:** `docs/superpowers/specs/2026-10-07-defense-system-links-design.md`
**Date:** 2026-10-07
**Status:** Plan only — no code written. Each task needs approval before starting.

Eight tasks, sequential. Tasks 1–3 are verifiable without UI; 5 and 6 depend on 4.
Revised after design review — decisions 9–13 landed, and one was dropped.

| # | Task | Needs DB | Needs UI |
| --- | --- | --- | --- |
| 1 | Pure helpers + tests | no | no |
| 2 | Schema + migration | yes | no |
| 3 | Schedule-scoped guard | yes | no |
| 4 | Server actions | yes | no |
| 4b | Verdict notification | yes | no |
| 5 | Panelist System tab | yes | yes |
| 6 | Student System card | yes | yes |
| 7 | Verify + docs | — | — |

Decisions resolved during review and what they changed:

- **9 (reschedule clears)** — no code. `rescheduleForRedefense` already
  soft-deletes and recreates the schedule, so the new set is empty.
- **11 (no reorder)** — `sortOrder` dropped from the model, reorder action and
  drag interaction dropped from the plan.
- **12 (panelists only)** — verified `PanelistRole` is `{ CHAIR, PANEL_MEMBER }`,
  so one membership test covers the chair and excludes advisers. No special case.
- **13 (verdict notification)** — found a real gap: `submitPanelistVerdict` sends
  nothing. Became Task 4b, copying the existing `rescheduleForRedefense` pattern.

---

## The one thing to know before starting

`requirePanelist()` in `lib/actions/guard.ts` is **global**:

```ts
const row = await prisma.defensePanelist.findFirst({
  where: { userId: +session.user.id, deletedAt: null },   // ← no scheduleId
  select: { id: true },
})
```

It answers "is this user a panelist somewhere", not "is this user a panelist on
**schedule 42**". Every other guard in that file is likewise unscoped. So Task 3
is not optional cleanup — it is the only thing standing between a panelist
assigned to one defense and another defense's links. Skipping it makes the
permission matrix in the spec decorative.

Do not reuse `requirePanelist()` for this feature.

---

## Task 1 — Pure helpers and tests

**New:** `lib/system-links.ts`, `lib/system-links.test.ts`
**Depends on:** nothing

No DB, no UI. Safest task to land first; the URL scheme check is the one piece
of genuine logic and it gets a real test.

```ts
export const LINK_PRESETS = [
  'GitHub', 'Figma Prototype', 'Flutter Build', 'Live Demo',
  'Database', 'API Docs', 'Other',
] as const

export function isAllowedLinkUrl(raw: string): boolean {
  try {
    const u = new URL(raw.trim())
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

export function linksAreEditable(verdict: string): boolean {
  return verdict === 'PENDING'
}

export function normalizeLabel(preset: string, custom: string): string {
  return preset === 'Other' ? custom.trim() : preset
}
```

`isAllowedLinkUrl` must reject `javascript:`, `data:`, `vbscript:` and relative
paths. `new URL()` throws on a relative path, which is the desired outcome.

**Verify:** `npx jest lib/system-links` — cases: `https://…` true, `http://…`
true, `javascript:alert(1)` false, `data:text/html,…` false, `not a url` false,
`/relative` false.

---

## Task 2 — Schema and migration

**Edit:** `prisma/schema.prisma`
**New:** `prisma/migrations/<ts>_defense_system_links/migration.sql`
**Depends on:** Task 1

Additive only. Two models exactly as specified — no extra columns, no lock flag
(the verdict already derives it).

- `DefenseSystemLink` — `scheduleId`, `groupId`, `label`, `url`, `note`,
  `copiedFromId`, `removedAt`, `createdById`, `deletedAt`, timestamps
- `SystemLinkComment` — `linkId`, `authorId`, `body`, `parentId`,
  `deletedAt`, timestamps

**No `sortOrder` column** (decision 11). Order by `createdAt`. Dropping it
removes the reorder action and the drag interaction from later tasks too.

Add back-relations on `DefenseSchedule`, `Group`, and `User`. Follow existing
soft-delete convention: `deletedAt DateTime?` plus a `@@index([deletedAt])`.

`onDelete: Cascade` from link to comments is correct — a hard-deleted schedule
takes its comments with it.

No reset logic for reschedule (decision 9): `rescheduleForRedefense` soft-deletes
the old schedule and creates a new row, so the new set is empty by construction.
Verified — nothing to build.

**Verify:**
```
npx prisma migrate dev --name defense_system_links
npx prisma generate
npx tsc --noEmit
```
Confirm the migration is `CREATE TABLE` + `CREATE INDEX` only. If Prisma offers
to reset the database, **stop** — the dev DB is Neon and holds real data.

---

## Task 3 — Schedule-scoped guard

**Edit:** `lib/actions/guard.ts`
**Depends on:** Task 2

One new function. Does not touch the existing guards — other features rely on
their current behaviour and changing it would ripple.

```ts
export async function requireSchedulePanelist(scheduleId: number) {
  const session = await requireFaculty()
  if (!session) return null

  // Panelist membership covers both roles: PanelistRole is { CHAIR, PANEL_MEMBER }.
  // Advisers are excluded because they have no DefensePanelist row (decision 12).
  const schedule = await prisma.defenseSchedule.findFirst({
    where: {
      id: scheduleId,
      deletedAt: null,
      panelists: { some: { userId: +session.user.id, deletedAt: null } },
    },
    select: { id: true, groupId: true, verdict: true, type: true },
  })
  return schedule ? { session, schedule } : null
}
```

Verified against the schema: `PanelistRole` is `{ CHAIR, PANEL_MEMBER }`, so a
single membership test grants the chair access and excludes advisers. No separate
chair predicate, and no admin bypass — decision 12 is panelists only.

The student side gets the equivalent check inside its own action: the student
must belong to `schedule.groupId`. `requireStudent()` is also unscoped, so the
group membership assertion is required there too.

---

## Task 4 — Server actions

**New:** `lib/actions/system-links.ts`
**Depends on:** Tasks 2, 3

Two surfaces, one file, so the permission logic sits next to each other.

**Reads**
- `getSystemLinks(scheduleId)` — links with comment counts, `removedAt` included
  so the panelist side can render removed links greyed out
- `getLinkComments(linkId)` — roots with nested replies, author name only
- `getGroupSystemLinks(scheduleId)` — student's own-group view

**Student writes** — each re-asserts group membership and `linksAreEditable`
- `addSystemLink(scheduleId, formData)`
- `updateSystemLink(linkId, formData)`
- `removeSystemLink(linkId)` — sets `removedAt` + `deletedAt`, **never** a hard
  delete, and refuses if comments exist and `verdict !== 'PENDING'`
- `copyProposalLinks(scheduleId)` — pre-fills the final defense set from the
  proposal defense set (decision 10). Reads the sibling schedule of the same
  `groupId` with the other `DefenseType`, clones rows, sets `copiedFromId`.
  Refuses when the current set is non-empty or the source is missing.

**Panelist writes** — each re-asserts schedule access via Task 3's guard
- `addSystemComment(linkId, formData)`
- `replyToSystemComment(parentId, formData)` — `parentId` only accepts a root
  comment id; a reply to a reply nests two deep at most

No reorder action (decision 11) — ordering is `createdAt`.

Every URL goes through `isAllowedLinkUrl` **server-side**. Client validation is
cosmetic.

Return the house shape: `{ success, message, payload? }`.

Cache: follow the `chapter.ts` pattern — `revalidateTag(tag, { expire: 0 })`, not
bare `revalidateTag(tag)`, so panelists see comments immediately rather than
after stale-while-revalidate. Two tags: `system-links-${scheduleId}` for the
panelist tab, `journey-${groupId}` for the student view.

**Verify:** tsc clean. Manual: student adds a link, it appears; panelist comments,
student sees it; a student cannot read another group's links.

## Task 4b — Verdict notification

**Edit:** `lib/actions/defense.ts` (`submitPanelistVerdict`)
**Depends on:** Task 4

One gap this feature closes (decision 13). `submitPanelistVerdict` currently
sends no notification, so a student never learns their result. `rescheduleForRedefense`
already does this correctly — copy its shape:

```ts
try {
  const members = await prisma.student.findMany({
    where: { groupId: schedule.groupId, deletedAt: null },
    select: { userId: true },
  })
  const milestoneSlug = schedule.type === 'FINAL' ? 'final-defense' : 'proposal-defense'
  if (members.length > 0) {
    await prisma.notification.createMany({
      data: members.map((m) => ({
        userId: m.userId,
        title: 'Defense verdict',
        body: `${groupName} received ${verdict}.`,
        href: `/student/milestone/${milestoneSlug}`,
      })),
    })
  }
} catch (notifyError) {
  console.error('[submitPanelistVerdict | notify Error]:', notifyError)
}
```

The `try`/`catch` is load-bearing: a failed notification must not roll back a
submitted verdict. `NotificationPanel` already renders these rows, so no UI work.

No notification on a comment — decision 13.

---

## Task 5 — Panelist System tab

**Edit:** `components/defense/DefenseSessionTabs.tsx`
**New:** `app/faculty/defense/[scheduleId]/(tabs)/system/page.tsx`
**New:** `components/defense/system/SystemTabPanel.tsx`, `SystemLinkCard.tsx`,
`SystemCommentThread.tsx`, `SystemCommentComposer.tsx`
**Depends on:** Task 4

Tab wiring first:

```ts
export type DefenseSessionTabKey = 'session' | 'system' | 'resubmission'

const TABS: ReadonlyArray<{ key: DefenseSessionTabKey; label: string }> = [
  { key: 'session', label: 'Session' },
  { key: 'system', label: 'System' },
  { key: 'resubmission', label: 'Resubmission' },
]
```

System sits **between** Session and Resubmission — panelists read what was built
before they read what was revised. Note `System` is a child segment, so an
unknown-tab check must accept `system`.

The page fetches and renders `SystemTabPanel`; it does not guard, consistent
with every other page in the app — the action guards, and `proxy.ts` handles the
role root.

Card: label, note, relative "updated" time, and an external-link anchor —
`target="_blank" rel="noopener noreferrer"`, never an iframe. Replies collapse
to a count that expands on click; keep threads expanded by default per §10.

Empty state is a plain "No links submitted yet" panel, not an error.

**Verify:** tsc clean. Tab reachable at `/faculty/defense/[id]/system`, survives
a reload, unknown tab still 404s.

---

## Task 6 — Student System card

**Edit:** `components/milestones/defense/tabs/DefenseTabPanel.tsx`
**New:** `components/milestones/defense/StudentSystemCard.tsx`
**Depends on:** Tasks 4, 4b, 5

Renders **only when the defense is scheduled** — no schedule, no card, not a
disabled one. Below `MilestoneDefenseDetailsCard`, as a separate section.

States per spec §6: scheduled-empty shows `+ Add link`; scheduled-with-links
lists them in creation order; verdict submitted hides all inputs and shows a
locked note while comments stay readable. Students read comments and cannot
reply.

At the final defense, when the set is empty and the proposal set is not, show
one button — *"Copy links from your proposal defense"* (decision 10). One click
calls `copyProposalLinks`, then the student confirms each row.

Add-link form: preset `<select>` plus a note line; `Other` reveals a free-text
label. Group members share the set, so the card names the group rather than
implying per-student ownership.

**Verify:** tsc clean. Unscheduled → no card. Scheduled → form submits. Verdict
submitted → inputs gone, comments still visible.

---

## Task 7 — Full verification and docs

**Depends on:** Tasks 1–6

```
npx tsc --noEmit
npx jest
npm run build
node "%TEMP%\opencode\enc-wt.js"     # encoding guard
git status --short
```

Baseline is 19 suites / 281 tests, all passing. A drop means something broke
silently — find it before moving on.

Then update:
- `docs/context/concepts/defense-lifecycle.md` — the System tab in the panelist
  flow, links editable until verdict
- `docs/context/guides/` — student submission path
- `AGENTS.md` — still stale from earlier today: missing `plugin-pan`,
  `plugin-zoom`, and the desktop-only document policy

---

## Cut list

Already cut by decision 11: manual reordering and the `sortOrder` column.

If this runs long, these go next and nothing else changes:

1. The note field — a label and URL may be enough
2. Panelist replies — keep roots only, drops the `parentId` relation entirely
3. `copyProposalLinks` — the student retypes; annoying, not broken

## Not doing

Rich text, attachments, link previews, notifications, and any completion
tracking — all in spec §9. Link previews specifically would need server-side
fetches of auth-walled pages and will fail on GitHub and Figma.