# Glossary

Domain terms used across the app and docs.

| Term | Meaning |
| --- | --- |
| **Section** | A class/course grouping owned by a `Coordinator`. Has a unique name, a `yearLevel`, and a join code for students. A student belongs to exactly one active section. |
| **Section slug** | URL-safe form of a section name (`BSIS 4AG1` → `bsis-4ag1`). Used for the `/sections/:slug` detail route. Slugs are case-insensitively matched back to the stored name. |
| **Group** | A capstone team. Section-agnostic in the schema: a group's section is implied by its members, so a group may theoretically span sections (see ADR-0001 move rule). |
| **Student** | A `User` with a `Student` record linking them to a section and optionally a group. Soft-deleteable. |
| **Activity** | Derived from `User.loggedInAt`: "Active now" within the last 5 minutes, else a relative time string (`timeAgo`), else "Never". Rendered via the shared `ActivityStatus` component. |
| **No group** | Student with `Student.groupId = null`; shown muted in the students table and filterable via the "No Group" filter option. |
| **Read-only monitoring** | The program chair's view of `/sections` and `/sections/:slug`: search, filter, sort, and drill-down only. No mutations until the coordinator management surface exists. |
| **Move Section** | (Deferred, ADR-0001) Reassigning a student to another section; allowed with a warning if it splits a group across sections. |
| **Remove Students** | (Deferred, ADR-0001) Soft-deleting a `Student` row; group membership is dropped with the student. |
