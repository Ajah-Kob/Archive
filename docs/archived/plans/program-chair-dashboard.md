# Archived Plan: Program Chair Dashboard

**Status:** Archived — Not implemented (2026-09-08)
**Owner:** User request during milestone phase-gates work
**Related:** Figma `ARCHIVE-PROTOTYPE-UI` node `747:6448` Container · `Section Overview` + `Faculty Capacity Overview` + `Calendar` + `Defense Overview` + `Alerts` · `proxy.ts` `isAdminOrProgramChair` + `hasCoordinatorAccess` · `lib/actions/sections.ts` `Section`/`Coordinator` · `lib/actions/faculty.ts` `Adviser` workload `ADVISER_CAP`
**Branch:** None (archived before implementation)

---

## 1. Goal
Give the **Program Chair** a single “oversee” page that consolidates the 3 separate faculty pages (`/faculty/faculties`, `/faculty/sections`, `/faculty/defense-scheduling`) into one at-a-glance view: *Are sections staffed? Are advisers overloaded? Are defenses moving? What needs my click?*

Figma top row: `Section Overview` `10 Total Sections` `/ 5 Assigned Coordinators` + `Faculty Capacity Overview` `24 Total Advisers` `Available 8/24` `#22c55e` `Loaded 11/24` `#f59e0b` `Full Load 5/24` `#fe6f6f`. Bottom 3-col: `Calendar April 2026 3 deadlines` (`Chapter 3 Submission Apr 10`, `Proposal Defense Apr 15`, `Final Manuscript Review Apr 22` mini grid) + `Defense Overview` (`For Defense 8`, `Completed 21`, `Defense Outcomes 21 total` Approved `12` green, Minor `5` amber, Major `3` orange, Rejected `1` red, `Upcoming Defenses Apr 15 9:00 AM BSIS 4A` +5 more) + `Alerts` (`5 Faculty fully loaded`, `2 Sections has no coordinators`, `Defense week starts in 3 days`, `New Capstone Faculty Member`).

---

## 2. Current State (as of 2026-09-08)
- **Route:** No dedicated chair dashboard. Chair uses same faculty routes as coordinator: `/faculty/faculties` (workload table), `/faculty/sections` (SectionsOverview `HeaderBar` + `SectionTable`), `/faculty/archiving` (ChairReview), `/faculty/defense-scheduling` — all gated by `proxy.ts` `isAdminOrProgramChair` / `hasCoordinatorAccess`.
- **Data already available, no schema change:**
  - `10` = `Section.count({deletedAt:null})`, `5` = `Coordinator.count({deletedAt:null})`
  - `24/8/11/5` = `Faculty where Adviser exists` + bucket `groupCount <2 Available, 2-4 Loaded, 5 Full` via `ADVISER_CAP` (from `FacultyTable` workload)
  - `8 vs 21` + outcomes = `DefenseSchedule.count` by `verdict` (`PENDING` vs `!=PENDING`, `APPROVED`/`MINOR_REVISION`/`MAJOR_REVISION`/`REJECTED`)
  - `Alerts` = `Faculty with groupCount>=ADVISER_CAP`, `Section where coordinator._count.section=0`, `DefenseSchedule where date within 7d`
- **Design debt:** Figma uses `bg-[#f4f6ff] p-[30px] gap-[10px]` `rounded-[14px] shadow[0_4px_24px_rgba(112,125,255,0.08)]` cards — matches current `SectionTable`/`FacultyTable` tokens but would duplicate calendar logic already planned.

---

## 3. Desired End State (when unarchived)
- **Route:** `app/faculty/page.tsx` becomes chair dashboard when `isProgramChair` (coordinator keeps current `faculty/page.tsx` redirect). Or new `app/faculty/dashboard/page.tsx` with `proxy.ts` `isAdminOrProgramChair` guard.
- **Layout:** `bg-[#f4f6ff] p-[30px] gap-[10px] flex-col` — Top `flex gap-[10px]`: `Section Overview` (2-col `Total Sections` / `Assigned Coordinators` `View All → /faculty/sections`) + `Faculty Capacity Overview` (`Total Advisers 24` left, `Capacity Distribution` bars right). Bottom `flex gap-[10px]`: `Calendar` `280px` + `Defense Overview` flex-1 + `Alerts` `280px`. All cards `bg-white border-[#eceef8] rounded-[14px] shadow`.

---

## 4. Implementation Steps (to execute when unarchived)
1. **Server actions** `lib/actions/chair-dashboard.ts` — 4 `use cache` queries with `cacheTag('chair-dashboard')` + `cacheLife('hours')`:
   - `getSectionsOverview()` → `{totalSections, assignedCoordinators}`
   - `getFacultyCapacity()` → `{totalAdvisers, available, loaded, fullLoad}` (bucket via `ADVISER_CAP`)
   - `getDefenseOverview()` → `{forDefense, completed, outcomes: {approved, minor, major, rejected, total}, upcoming: DefenseSchedule[]}`
   - `getAlerts()` → `5 Faculty fully loaded`, `2 Sections no coordinator`, `Defense week in 3d`, `New Faculty` (limit 4)
2. **UI** `components/chair/` — `SectionOverviewCard`, `FacultyCapacityCard` (bars `bg-[#eff1fa] h-[6px] rounded-[4px]` + fills `#22c55e/#f59e0b/#fe6f6f`), `CalendarCard` (start as **list** `Upcoming Deadlines` from `DefenseSchedule.date` + `MilestoneAvailability.openedAt`, grid later), `DefenseOverviewCard` (`For Defense` blue `bg-[#f0f0ff]`, `Completed` mint `bg-[#dcfce7]`, outcomes bars), `AlertsCard` (pink/amber/blue per Figma).
3. **Route** `app/faculty/page.tsx` — `getServerSession` → if `isProgramChair` render dashboard, else redirect to current faculty home; keep `proxy.ts` `isAdminOrProgramChair` for `/faculty/archiving` and add for dashboard.
4. **Validation:** `npx tsc --noEmit` + `npx next build` (45+ routes, new dashboard), `proxy.ts` still lazy `getToken`, no DB in proxy for dashboard (server actions do DB).
5. **Branch:** `feature/chair-dashboard` preview, `develop` untouched until approved.

---

## 5. Risks & Mitigations
- **Calendar mini-grid is heavy** (date grid + 3 dots + `DefenseSchedule` + `MilestoneAvailability` deadlines) → Ship **list first**, grid later (saves ~60% work).
- **Alerts staleness** (`use cache` hours) → Use `revalidateTag('chair-dashboard')` on `DefenseSchedule`/`Section` mutations or `cacheLife('minutes')` for alerts.
- **Duplicate queries** (dashboard + underlying pages) → Share `cacheTag` so `Section`/`DefenseSchedule` writes bust dashboard.

---

## 6. Decision Log
- 2026-09-08: User: “We have a ui for it but idk if its good to implement. Can you check the figma?” — Figma `747:6448` reviewed, deemed good for oversee but deferred.
- 2026-09-08: User: “Archive this plan for now. Cuz i want to build a calendar page.” — Archived.

---

## 7. Unarchive Checklist
- [ ] Create branch `feature/chair-dashboard` from `develop` (or `feature/student-milestone-overview` if you want calendar data shared)
- [ ] Implement `lib/actions/chair-dashboard.ts` 4 queries
- [ ] Build 5 cards pixel-perfect to Figma `747:6448` (start Calendar as list)
- [ ] Add `app/faculty/page.tsx` role switch + `proxy.ts` guard
- [ ] Run `npx tsc --noEmit` + `npx next build` + manual QA as Program Chair (seed `admin@domain.com` → toggle Program Chair)
- [ ] Do not add `CapstoneJourney` or `MilestoneAvailability` writes in dashboard — read-only overview
