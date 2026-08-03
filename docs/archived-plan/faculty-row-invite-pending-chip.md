# Archived Plan: Row-level Coordinator Invites + Pending Chip

Status: ARCHIVED (2026-08-02) — deferred by user. May be revisited.

## Context

The `/faculty` page manages faculty. Currently, inviting faculty to become coordinators happens in the Manage Coordinators drawer's "Available Faculty" list. This plan moves the invite into the faculty table's row action menu and shows a "Pending invitation" chip in the Coordinator column.

## Decisions (confirmed with user)

- **Single entry point:** invites/cancels live only in the row action menu. The Manage Coordinators drawer drops its Available Faculty section and keeps only Assigned Coordinators. `getAvailableFaculty` + `AvaiableFacultyList` are removed.
- **Role scope:** Coordinator invites only. Adviser invites can reuse `sendInvitation`'s role param later.

## Planned Changes

1. **`lib/actions/faculty.ts` — `getFacultyMembers`**: include `invitations: { where: { role: 'COORDINATOR', status: 'PENDING', deletedAt: null }, select: { id: true } }`; payload adds `pendingCoordinatorInviteId: number | null`.
2. **`FacultyTable.tsx`**: `FacultyMember` gains `pendingCoordinatorInviteId`; new props `onInvite` / `onCancelInvite`; Coordinator cell precedence: live sections pill → amber "Pending Invitation" chip (`rgba(245,158,11,0.07)` bg / `#f59e0b` text, per `AvaiableFacultyList.tsx:128-131`) → "Not assigned as coordinator"; row menu: View Details / Invite as Coordinator (when `!isCoordinator && !pendingCoordinatorInviteId`) or Cancel Invitation (when pending) / Remove Faculty.
3. **`FacultyList.tsx`**: `RawMember` + `FacultyMember` carry invite id; `useSession` for `senderId`; `confirmingInvite`/`confirmingCancel` states; `handleInvite` → `sendInvitation(member.id, 'COORDINATOR', senderId)`; `handleCancel` → `cancelInvitation(inviteId)`; extract `loadFaculty()` for mount + post-mutation refetch (both actions already `revalidateTag('faculty', 'max')`); reuse `InviteConfirmationModal` + `InviteCancelationModal` (in `components/faculty/modal/`).
4. **`ManageCoodinatorDrawer.tsx`**: drop `AvailableFacultyList`, `getAvailableFaculty` / `getPendingCoordinatorInvitations` fetches; keep Assigned Coordinators; `handleCoordinatorRemoved` keeps only the coordinators filter.
5. **Cleanup**: delete `components/faculty/drawer/AvaiableFacultyList.tsx` and `getAvailableFaculty`/`getAvailableFacultyData` (verify no other consumers).

## Notes

- `sendInvitation`/`cancelInvitation` already revalidate the `faculty` tag — chip freshness needs no new server logic.
- Accepting happens in the invitee's session; PG's open page stays stale until next refetch (same behavior as current drawer).
- Live coordinators never show Invite; rejected/cancelled invites don't block re-invites (`sendInvitation` only checks PENDING).
- Pending rows sort with coordinator = 0 (no sorting change).
