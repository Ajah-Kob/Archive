# Archived Plan: Group Activity Feed

**Status:** Archived — Analysis complete, not implemented (2026-09-22)
**Owner:** User request during final-topic work (“what is the recent activity in my group?”)
**Related:** `/student/my-team` (future feed home) · `lib/actions/audit.ts` `AuditLog` · `lib/actions/invitation.ts` (no audit) · `lib/actions/topic.ts` `saveFinalTopic` (no audit) · `GroupDashboard.tsx`
**Branch:** None (archived before implementation)

---

## 1. Goal
Answer “what recently happened in my group?” on `/student/my-team`: adviser approved a document, defense scheduled, new member joined, topic saved — everything the group must know, newest first.

---

## 2. Activity Inventory (as of 2026-09-22)

### Membership — mostly covered
- Group created / renamed — check coverage; remove/leave/transfer audited (`GROUP_REMOVE_MEMBER`, `GROUP_LEAVE`, `GROUP_TRANSFER`, `GROUP_CREATE`).
- Member invited / invite accepted / declined / cancelled — **gap**: `invitation.ts` writes no audit rows. Derivable from `Invitation` status flips, but actor info is weak without audit snapshots.

### Adviser — partially covered
- Adviser invite sent / cancelled — no audit (`ADVISER_ASSIGNMENT` invitations).
- Adviser accepted / assigned — headline feed event; verify audit or derive from `group.adviserId` being set.

### Topic — gap by design
- Final topic saved / updated — `saveFinalTopic` writes **no audit row**. Only possible record of the event; needs an audit call (topic `updatedAt` alone carries no actor).

### Chapters — covered
- Submitted / resubmitted per chapter (`CHAPTER_SUBMIT`, `CHAPTER_RESUBMIT` with file/version info).
- Reviewed approved / needs revision (`CHAPTER_REVIEW` with reviewer + note).

### Defense — covered (verify resubmission path)
- Scheduled / rescheduled / cancelled, proposal + final (`DEFENSE_SCHEDULE_*` with date/venue).
- Verdict submitted (`DEFENSE_VERDICT`).

### Archiving & publishing — covered
- Submitted for review / approved & published (`ARCHIVING_SUBMIT`, `ARCHIVING_APPROVE`, `ARCHIVE_PUBLISH`).

### Section-level (coordinator actor, affects the group)
- Joined section (`GROUP_JOIN`).
- Capstone 1/2 opened, milestone toggles — **gap**: no audit; derivable from `MilestoneAvailability` but actorless.
- Calendar events audited but audience-scoped; include only if targeted at the section/group.

---

## 3. Cross-Cutting Gaps (must close for a trustworthy feed)
1. **Invitation lifecycle audit** (member + adviser invite/accept/decline/cancel).
2. **Audit call in `saveFinalTopic`.**
3. **Feed scoping**: `AuditLog` has no `groupId` — build an entity→group mapping (GROUP→direct, CHAPTER→milestone→group, DEFENSE→schedule→group, etc.).
4. Actor snapshots already denormalized in audit — good for “Adviser X approved Chapter 1” surviving renames.

---

## 4. Implementation Steps (to execute when unarchived)
1. **Audit backfill** — add `audit()` calls for invitation lifecycle + `saveFinalTopic` (+ adviser assignment if missing).
2. **Feed query** — new `getGroupActivityFeed(groupId)` in `lib/actions/` (or `audit.ts`): entity→group mapping, newest-first, paginated, `use cache` tagged per group with revalidation on the same mutations.
3. **UI on `/student/my-team`** — activity card/section under the group card: icon per event type, actor + action + relative time, filter (all/members/reviews/schedule) + pagination. Reuse `timeAgo` + pill language from `ActivityStatus`/badges.
4. **Validate** — `tsc`, click-through (invite→accept shows “X joined”, review shows verdict, schedule shows event).
