# Design: Defense System Links

**Status:** Design approved, not implemented. No code written.

- **Date:** 2026-10-07
- **Feature name:** System Links
- **Surface:** Proposal defense + final defense, on both student and panelist sides

---

## 1. Requirement

From the client consultation:

> Students upload links to their prototype or system at the proposal defense and
> the final defense. Links include GitHub, Figma prototypes, Flutter builds, and
> other links to the group's prototype or finished system. Panelists open those
> links and leave comments about what to revise or what feature to add.

The panelist already has a Session tab and a Resubmission tab on
`/faculty/defense/[scheduleId]`. This adds a **System** tab.

## 2. Decisions

| # | Question | Decision | Rationale |
| --- | --- | --- | --- |
| 1 | When can students submit links? | **Once the defense is scheduled.** Before that the feature does not exist for them. | The schedule is what makes the defense real — panelists and a date exist. |
| 2 | Per-defense sets, or one shared set edited in place? | **A fresh set per defense.** | Panelist comments are the valuable artefact. A comment from the proposal defense must stay attached to that defense rather than being overwritten when the group updates the URL later. |
| 3 | When does the set lock? | **When the chair submits the verdict.** | The student keeps a window through the defense to fix a dead link. |
| 4 | Tab name | **System** | Covers both the prototype (proposal) and the finished build (final). `Prototype` would be wrong at the final defense. |
| 5 | Can students reply to panelist comments? | **No.** | One-way channel. Students see the feedback. |
| 6 | Whose links? | **Group-level.** One shared set per group per defense, any member may add. | Per-member sets would be unmanageable on a 5-person group. |
| 7 | Should a comment be markable resolved? | **No.** | Not requested, and it adds a state to the model for no consumer. Comments are just comments. |
| 8 | Can the chair delete a panelist's comment? | **No.** | Panelists own their own threads. |

**Consequence of decision 5:** the channel is one-way. Panelists discuss the
system among themselves; students read the result. There is no in-product signal
that a point has been addressed.

**Consequence of decisions 5 and 7 together:** nothing in this feature tracks
completion. The panelist tab is a discussion record of what was raised, not a
task list. That is deliberate — a later "were these addressed?" feature would
need its own design, and guessing at it now would be speculative.

**Consequence of decision 3:** links stay editable while panelists are reading.
Two mitigations are designed in: links are soft-deleted so removing one cannot
destroy panelist comments, and every link shows when it last changed.

## 3. Lifecycle

```
Defense not scheduled ──▶ (nothing renders for students; no System tab content)
          │
          ▼ coordinator schedules
Scheduled ──▶ students may add / edit / remove links
          │
          ▼ panelists comment throughout
          │
          ▼ chair submits verdict
Locked ──▶ inputs gone, comments still readable
```

Two independent schedules each get their own set: the proposal defense set is
distinct from the final defense set (decision 2).

**Resubmissions carry over.** The set is keyed on the schedule, not the defense
type, so a revised submission keeps the same links. Students re-point a URL at
the revised build instead of starting again.

## 4. Data model

Two new tables. Both soft-deletable, matching every other model in the schema.

```prisma
model DefenseSystemLink {
  id          Int      @id @default(autcrement())
  scheduleId  Int
  schedule    DefenseSchedule @relation(fields: [scheduleId], references: [id], onDelete: Cascade)
  groupId     Int
  group       Group     @relation(fields: [groupId], references: [id], onDelete: Cascade)
  /// Preset label from LINK_PRESETS, or free text when label is "Other".
  label       String
  url         String
  /// One line describing what this link shows.
  note        String?
  sortOrder   Int       @default(0)
  /// Set when a student removes a link a panelist has already commented on.
  /// The row survives so the thread stays attached.
  removedAt   DateTime?
  createdById Int
  createdBy   User       @relation(fields: [createdById], references: [id])
  comments    SystemLinkComment[]
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt
  deletedAt   DateTime?

  @@index([scheduleId])
  @@index([groupId])
  @@index([deletedAt])
}

model SystemLinkComment {
  id       Int      @id @default(autcrement())
  linkId   Int
  link     DefenseSystemLink @relation(fields: [linkId], references: [id], onDelete: Cascade)
  authorId Int
  author   User      @relation(fields: [authorId], references: [id])
  body     String
  /// null = root comment. Set = a panelist reply to that root.
  parentId Int?
  parent   SystemLinkComment?  @relation("Thread", fields: [parentId], references: [id], onDelete: Cascade)
  replies  SystemLinkComment[] @relation("Thread")
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
  deletedAt    DateTime?

  @@index([linkId])
  @@index([parentId])
  @@index([deletedAt])
}
```

### Why soft delete on links

Because the set stays editable until the verdict (decision 3), a student can
remove a link a panelist has already commented on. Hard-deleting would take the
panelist's feedback with it. A removed link renders greyed out on the panelist
side, with its thread intact — "they took this down" is itself information.

### Locking is derived, not stored

`DefenseSchedule.verdict` is `PENDING` until the chair submits. So:

```ts
function linksAreEditable(schedule: { verdict: string }): boolean {
  return schedule.verdict === 'PENDING'
}
```

No new status field, no cron job, nothing to keep in sync.

## 5. Security

Links are user-supplied and rendered as anchors, so:

- **Scheme validation server-side.** Only `http:` and `https:`. Reject
  `javascript:`, `data:`, and everything else — checked in the action, not just
  the form.
- **Always `rel="noopener noreferrer"`** on every external link, with
  `target="_blank"`.
- **Never an iframe.** GitHub and Figma send `X-Frame-Options` /
  `frame-ancestors` and will refuse to render embedded. Links open in a new tab.
- Panelist reads are scoped to links on the schedule they are assigned to — the
  server action must re-check the session relationship, not trust the route.

## 6. Student UI

The links belong in the Defense tab students already have
(`/student/milestone/[milestone]/defense`), not a new page. A link is submitted
*for a defense*, exactly like the document is.

```
┌──────────────────────────────────────────────────┐
│  Chapter 3 document                  [verdict]   │  ← exists today
└──────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────┐
│  System                            + Add link    │  ← new
│                                                  │
│  GitHub · Repository                        ↗    │
│  updated 2 days ago                            │
│  ┌────────────────────────────────────────────┐  │
│  │ A. Reyes · Panelist                        │  │
│  │ Needs filtering on the dashboard.          │  │
│  │ ↳ 2 replies                               │  │
│  └────────────────────────────────────────────┘  │
│  Figma · Prototype                          ↗    │
│  Flutter · Test build                       ↗    │
└──────────────────────────────────────────────────┘
```

| State | Behaviour |
| --- | --- |
| Not scheduled | Card does not render. |
| Scheduled, no links | Card renders with the empty state and `+ Add link`. |
| Scheduled, with links | List, add, edit, remove, reorder. |
| Verdict submitted | Inputs gone, "Locked" note shown, comments still readable. |

Students **read** panelist comments and cannot reply (decision 5).

**Add-link form:** preset dropdown (`LINK_PRESETS`) plus a `note` line.
Preset rather than free text so labels are consistent and the panelist side can
group meaningfully.

Suggested presets: GitHub, Figma Prototype, Flutter Build, Live Demo, Database,
API Docs, Other. `Other` reveals a free-text label field.

## 7. Panelist UI

New third tab on `/faculty/defense/[scheduleId]/system`, beside Session and
Resubmission.

Per link: the link opens in a new tab, and its discussion sits below it.
Panelists can post a comment and reply within a thread.

Panelist-only affordance, since students cannot (decision 5): **reply**.

**Empty state:** *"No links submitted yet."* A legitimate answer, not an error
— the group may simply not have submitted. It must not look broken.

**Removed links** render greyed out, labelled removed, with their discussion
intact.

## 8. Permissions

| Actor | Read links | Add/edit links | Comment | Reply |
| --- | --- | --- | --- | --- |
| Student (group member) | own group | own group, until verdict | — | — |
| Panelist (assigned) | yes | no | yes | yes |
| Chair | yes | no | yes | yes |
| Other faculty | no | no | no | no |

Every server action re-checks these. The route is not the guard — consistent
with the rest of the codebase, where `proxy.ts` handles role roots and actions
re-verify.

## 9. Out of scope

- Students replying (decision 5)
- Marking a comment resolved, or any completion tracking (decision 7)
- The chair deleting or editing a panelist's comment (decision 8)
- Rich text — comments are plain text, matching the existing annotation comment
- Attachments or screenshots on a comment
- Email or in-app notification when a comment is posted
- Link previews / thumbnails (would require server-side fetching of auth-walled
  pages, which will fail)
- Any change to the defense verdict flow

## 10. Open questions

None blocking. One to settle during implementation, which does not change the
model: **should a thread with replies collapse to a summary line when closed?**
Default is to keep it expanded — with no resolve state, the discussion is the
only record and hiding it would work against the student-side read.

## 11. Where this lands

| Area | Files |
| --- | --- |
| Schema | `prisma/schema.prisma` — two models + relations on `DefenseSchedule`, `Group`, `User` |
| Migration | new migration, additive only |
| Constants | `lib/system-links.ts` — `LINK_PRESETS`, scheme validation, `linksAreEditable` |
| Actions | `lib/actions/system-links.ts` — add/update/remove link, add comment, reply to thread |
| Panelist UI | `components/defense/system/` — tab panel, link card, thread, composer |
| Student UI | `components/milestones/defense/` — System card added to the existing defense tab panel |
| Tab | `components/defense/DefenseSessionTabs.tsx` — add `system` to `TABS` and `DefenseSessionTabKey` |
| Routes | `app/faculty/defense/[scheduleId]/(tabs)/system/page.tsx` |
| Cache | revalidate the defense session tag after any mutation |
| Docs | `docs/context/concepts/defense-lifecycle.md`, `docs/context/guides/` |