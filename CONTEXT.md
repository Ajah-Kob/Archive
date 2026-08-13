# Nextcrud — Capstone Management Context

This file defines the domain vocabulary used across the codebase (models,
actions, UI). Keep it in sync when the domain changes. See
`docs/01-project-overview.md` and `docs/04-business-rules.md` for the
higher-level product and rules.

---

## Glossary

| Term     | Definition                                                                                                                                  |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Faculty  | A registered user with a `Faculty` record. May hold zero or more roles (adviser, coordinator) simultaneously. Program Chair is a flag (`isProgramChair`) on the `Faculty` record, not a role. |
| Adviser  | A faculty member with a live `Adviser` record. Always attached to capstone groups via `Capstone.adviserId` — an adviser without advisees has zero attached groups. |
| Advisee  | A capstone group assigned to an adviser (a live `Capstone` row with `adviserId` set). Not a user record — group-level, not student-level. |
| Workload | The number of live advisees a faculty member currently supervises. Capped at `ADVISER_CAP` (see `config/constants.ts`). Workload 0 renders as "No assigned groups". |
| Coordinator | A faculty member with a live `Coordinator` record. Manages one or more `Section`s (`Section.coordinatorId` is required). |
| Program Chair | The faculty member with `Faculty.isProgramChair = true`. With admins, may manage faculty/coordinators on `/faculty` and `/coordinator`. |
| Faculty Removal | Soft-deletes `Faculty` + any live `Adviser`/`Coordinator` records and demotes the user to `GUEST`. Blocked while the faculty has advisees or managed sections. |

## Important rules

- Soft deletes are enforced at query time (`deletedAt: null`). Prisma relation
  includes ignore soft deletes — always re-check `deletedAt` in JS or filter
  relation counts.
- A live role record is `deletedAt === null` (an adviser or coordinator can be
  re-invited after removal by reviving the same row via upsert on `facultyId`).
- Session role flags (`isCoordinator`, `isProgramChair`, etc.) are refreshed
  from the DB on every session poll (`refetchInterval: 60` in `providers.tsx`).
