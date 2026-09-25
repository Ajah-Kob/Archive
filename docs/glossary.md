# Glossary

Domain terms used across the app and docs.

| Term | Meaning |
| --- | --- |
| **Section** | A class/course grouping with a required academic year and an optional assigned `Coordinator`. Has an active-unique name within its academic year and a join code for students. A student belongs to exactly one active section. |
| **Section slug** | URL-safe form of a section name (`BSIS 4AG1` → `bsis-4ag1`). Used for the coordinator workspace detail route `/faculty/my-sections/:sectionId`. |
| **Unassigned section** | A live section with `coordinatorId = null`. Its empty Coordinator cell shows only `+ Assign coordinator`, remains discoverable through the `No Coordinator Assigned` search term, and stays hidden from `/faculty/my-sections` until assigned. |
| **Unavailable coordinator** | A section that still has a stored `coordinatorId` but whose Coordinator, Faculty, or User chain is soft-deleted. The global row shows `Unavailable` and offers Edit Coordinator so a manager can replace the inactive owner. |
| **Academic year** | The required business identity for a section, displayed as `YYYY–YYYY` (for example `2026–2027`). Active section names are unique within an academic year; archived sections do not reserve names. |
| **Archived section** | An empty section soft-deleted by an Admin or Program Chair. It is hidden from active lists and releases its name for reuse; its database row remains preserved, but no restore interface is currently provided. |
| **Group** | A capstone team. Section-agnostic in the schema: a group's section is implied by its members, so a group may theoretically span sections (see ADR-0001 move rule). |
| **Student** | A `User` with a `Student` record linking them to a section and optionally a group. Soft-deleteable. |
| **Activity** | Derived from `User.loggedInAt`: "Active now" within the last 5 minutes, else a relative time string (`timeAgo`), else "Never". Rendered via the shared `ActivityStatus` component. |
| **No group** | Student with `Student.groupId = null`; shown muted in the students table and filterable via the "No Group" filter option. |
| **Global sections** | The Admin and Program Chair management views at `/admin/sections` and `/faculty/section-management`: global create, edit, archive, coordinator assignment/reassignment, search, Phase filtering, sorting, academic-year display, and unassigned-section handling. |
| **Move Section** | (Deferred, ADR-0001) Reassigning a student to another section; allowed with a warning if it splits a group across sections. |
| **Remove Students** | (Deferred, ADR-0001) Soft-deleting a `Student` row; group membership is dropped with the student. |
