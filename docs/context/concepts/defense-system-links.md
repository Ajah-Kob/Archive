# Concept: Defense System Links

**Status:** Implemented, migration pending.

A defense is not only a PDF. Each defense also carries a set of **links** the
group submits — GitHub, a Figma prototype, a hosted build — and the panel leaves
comments on what to revise or add.

---

## The shape of it

Two tables, keyed on the **schedule** rather than the defense type:

```
DefenseSchedule (id, groupId, type, verdict)
        │
        └── DefenseSystemLink  (label, url, note, removedAt)
                    │
                    └── SystemLinkComment  (body)
```

Keying on the schedule is what makes "a fresh set per defense" fall out for
free: the proposal defense's rows and the final defense's rows are simply rows on
different schedules. Keying on `DefenseType` instead would have made it
impossible to tell two submissions of the same defense apart.

## Why `removedAt` is separate from `deletedAt`

Students may edit the set until the chair submits the verdict. That means a group
can **withdraw a link after a panelist has already commented on it.**

Hard-deleting would take the feedback with it. So removal sets both `removedAt`
and `deletedAt`, and the row survives with its thread:

- **Panelist side** — renders greyed out, labelled `Removed`, sunk below the
  active links, Open button dropped. The thread stays readable.
- **Student side** — filtered out entirely. They never saw it go away.

That asymmetry is intentional. "They took this down" is information for a
panelist and noise for a student.

## Locking is derived, never stored

```ts
linksAreEditable(verdict)  // verdict === 'PENDING'
```

`DefenseSchedule.verdict` is already `PENDING` until the chair submits. There is
no second flag to keep in sync with the first.

## Reschedule

`rescheduleForRedefense` soft-deletes the old schedule and creates a new row, so
the new set is empty by construction. **No reset logic exists** — the reset *is*
the new schedule.

## Access

| Actor | Read | Write links | Comment |
| --- | --- | --- | --- |
| Student (group member) | own group | own group, until verdict | — |
| Panelist (`PANEL_MEMBER`) | yes | no | yes |
| Chair (`CHAIR`) | yes | no | yes |
| Adviser (not a panelist) | no | no | no |

`PanelistRole` is `{ CHAIR, PANEL_MEMBER }`, so **one membership test covers the
chair** and excludes advisers for free.

Use `requireSchedulePanelist(scheduleId)` / `requireScheduleStudent(scheduleId)`
from `lib/actions/guard.ts`. **`requirePanelist()` is unscoped** — it answers "is
this user a panelist on *some* defense" and cannot gate anything
defense-specific.

## Deliberate non-features

Recorded so a later reader does not add them back:

- **No completion tracking.** No `resolvedAt`, no resolve button. Nothing tracks
  whether a raised point was addressed. The panelist tab is a discussion record,
  not a task list.
- **No student replies.** One-way. Students read the discussion.
- **No notification on a comment.** The single notification is the **verdict**,
  which `submitPanelistVerdict` now sends (it previously sent nothing at all).
- **No manual reordering.** Creation order.
- **No link previews.** Would require server-side fetches of auth-walled pages,
  which fail on GitHub and Figma.
- **No iframe.** Both refuse framing. Links open in a new tab with
  `rel="noopener noreferrer"`, and the URL scheme is validated server-side.

## Copy from the other defense

Removed. Each defense's link set is entered fresh; the `copiedFromId`
provenance column and the pre-fill action were dropped with it.

## Archive

When a defense is archived, links and comments are kept as a historical record
and the set goes read-only. Links are not re-fetched: external targets rot, so
the archive preserves *what was submitted and discussed*, not a promise the URL
still resolves.

---

**Spec:** `docs/superpowers/specs/2026-10-07-defense-system-links-design.md`
**Plan:** `docs/superpowers/plans/2026-10-07-defense-system-links.md`

**Related**:
- concepts/defense-lifecycle.md
- concepts/defense-verdicts.md
- guides/resubmissions-tab.md