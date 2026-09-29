# ARCHIVE Program Chair Dashboard — Design

**Date:** 2026-09-30
**Status:** Draft for review
**Deadline:** demo tomorrow (2026-10-01)
**Figma:** node `747:6448` (screenshot supplied; MCP not connected)
**Prior art:** `docs/archived/plans/program-chair-dashboard.md` (2026-09-08) — structure and query plan still valid
**Baseline:** `develop` @ `6839b5f`

---

## 1. Goal

Give the Program Chair one screen that answers the four questions the role exists to
answer, and puts every answer one click from the page where they can act on it.

* Are sections staffed?
* Are advisers at capacity?
* Are defenses moving?
* What needs my click?

The chair is not an elevated coordinator. `proxy.ts` grants them three exclusive
actions — `faculty-management/coordinators`, `section-management`, `archiving` —
and the dashboard must lead toward those.

---

## 2. Scope

### In (tomorrow)

| # | Item |
|---|---|
| 1 | Four cards per Figma `747:6448`: Section Overview, Faculty Capacity, Calendar, Defense Overview |
| 2 | Full month-grid calendar, not the list fallback the Sept plan suggested |
| 3 | **Section Phase Spread** card — Capstone 1 / Capstone 2 only |
| 4 | `REDEFENSE` labelled **"Redefense Required"** |
| 5 | Server actions + card components only. **No route wired yet** |

### Deferred

| Item | Reason |
|---|---|
| Alerts card | Chair-only actions need surfacing; planned next |
| Defence-readiness warnings | Folding into Alerts when it lands |
| Program-wide activity feed | Skipped for now |
| Topic approval progress | **Dropped.** `TopicStatus` exists in schema but only `saveFinalTopic` writes it; no review workflow exists. The enum is vestigial. |
| Adviser load spread per section | Skipped |

---

## 3. Data — no schema change

Every number derives from existing tables.

| Card | Source |
|---|---|
| Section Overview | `Section.count({deletedAt:null})`; `coordinatorId != null`; `coordinatorId == null` |
| Faculty Capacity | `Group.adviserId` grouped by adviser, cap = `ADVISER_CAP` (8) |
| Section Phase Spread | `MilestoneAvailability.openedAt` per section — Capstone 2 when its key is opened |
| Calendar | `DefenseSchedule.date`; `ArchivingSubmission` deadlines |
| Defense Overview | `DefenseSchedule.verdict`, `.date`, `.type` |

### Bucket thresholds

`ADVISER_CAP = 8`. Figma's mock used a cap of 5, so the bar values in the design
will not match production until real data is seeded. Thresholds:

| Bucket | Groups held | Mock showed |
|---|---|---|
| Available | 0–1 | 8/24 |
| Loaded | 2–7 | 11/24 |
| Full Load | 8+ | 5/24 |

---

## 4. Components

New directory `components/chair/`. Each card is independent and reads one action.

| Component | Responsibility |
|---|---|
| `SectionOverviewCard` | 3 stat columns; each links to `/faculty/section-management` |
| `FacultyCapacityCard` | Adviser total + 3 capacity bars; bars link to `/faculty/faculty-management/advisers` |
| `SectionPhaseCard` | Capstone 1 / Capstone 2 counts as proportional bars |
| `CalendarCard` | Month grid, today marker, numbered deadline days, 3 deadline rows |
| `DefenseOverviewCard` | 2 stat tiles, 4 outcome bars, 3 upcoming rows, "+N more" |

### Actions — `lib/actions/chair-dashboard.ts`

Five cached reads, all `'use cache'` + `cacheTag('chair-dashboard')` +
`cacheLife('hours')`:

| Function | Returns |
|---|---|
| `getSectionOverview()` | `{ total, assigned, unassigned }` |
| `getFacultyCapacity()` | `{ totalAdvisers, available, loaded, fullLoad, cap }` |
| `getSectionPhaseSpread()` | `{ capstone1, capstone2, total }` |
| `getDefenseOverview()` | `{ forDefense, completed, outcomes, upcoming }` |
| `getDefenseDeadlines()` | `{ date, label, kind }[]` for the calendar |

Every query filters `deletedAt: null`. Reads only — **no mutations, no writes.**

---

## 5. Layout

```
┌──────────────────────────┬────────────────────────────────┐
│  Section Overview        │  Faculty Capacity Overview     │
├──────────────────────────┼───────────┬────────────────────┤
│  Calendar  (280px)       │  Section  │  Defense Overview  │
│                          │   Phase   │                    │
│                          ├───────────┤                    │
│                          │  (280px)  │                    │
└──────────────────────────┴───────────┴────────────────────┘
```

`SectionPhaseCard` takes the free right column beside Calendar. The 2×2 grid
becomes 2×2 with a stacked card — Calendar and Section Phase share the left
column, Defense Overview keeps the wide right.

Responsive: Figma is desktop. Below `lg` the cards stack in DOM order — Section
Overview, Faculty Capacity, Calendar, Section Phase, Defense Overview.

---

## 6. Error handling

Per the project standard, actions return `{ success, message, payload }` and never
throw. A failed query renders its card in an empty state with the failure message
inline — one dead query must not blank the dashboard. Sections with no
`MilestoneAvailability` rows are unclassified, not counted as Capstone 1.

---

## 7. Testing

No unit tests over the arithmetic — the bucket thresholds are the only logic worth
asserting, and they are three comparisons. Verification is:

- `npx tsc --noEmit`
- `npx next build`
- Manual pass as Program Chair, comparing each figure against
  `/faculty/section-management` and `/faculty/faculty-management/advisers`
- **Every number checked against its source page.** A demo that shows a wrong
  count is worse than one showing fewer numbers.

---

## 8. Open questions

1. **Unassigned sections count** — confirmed as the third column in Section
   Overview. Shows sections with `coordinatorId == null`. The mock renders it with
   a green check icon, which reads as *good*; an unstaffed section is a problem.
   Recommend an amber or red icon instead. Awaiting sign-off.
2. **A section that has never opened Capstone 2** — is it Capstone 1, or a third
   "Not started" state? Proposal: treat as Capstone 1, since the phase gate is
   closed rather than absent.
3. **Calendar deadline sources** — which `MilestoneAvailability` keys surface as
   deadline dots, and where the "3 DEADLINES" rows are sourced from.
