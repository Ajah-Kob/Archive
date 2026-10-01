# ARCHIVE — Responsive QA Checklist

**Scope:** every route touched by the responsive effort (baseline `c02f724`).
**How to use:** work top to bottom. Tick only what you actually opened.
**Test widths:** 375px (floor) · 768px · 1024px · ≥1280px (desktop regression)

---

## 0. Uncommitted — test first

Nothing here is saved. Test before anything else.

- [ ] `/student/milestone` — **"Capstone 1" must read fully.** A 30px white progress line was erasing the "C". Scroll to Final Defense; nothing clipped.
- [ ] `/student/milestone/[milestone]/chapter-1` — status callout matches `VerdictCallout`: icon + text side by side, **"Review feedback"** full-width beneath
- [ ] `/student/my-team` — 16px side gutter (not 64px)

---

## 1. Desktop regression — do this early

Every fix was mobile-first with an `sm:` restore. If desktop shifted, a breakpoint class is wrong.

- [ ] Chapter status callout ≥640px — icon + text on one line, button right (as before)
- [ ] Chapter upload row ≥640px — single line
- [ ] `/student/milestone` ≥640px — 32px gutters
- [ ] `/student/my-team` ≥640px — 32px gutters
- [ ] `/guest` ≥640px — unchanged
- [ ] Nav breakpoint — rail at 1024px+, hamburger below

---

## 2. Nav & shell (affects all 46 authed routes)

- [ ] Any authed route @375px — hamburger → **full role-aware nav**
- [ ] Repeat for a **student**, **faculty/adviser**, **coordinator**, **admin**, **guest**
- [ ] **768 / 900 / 1023 / 1024px** — `md`→`lg` move. *900–1023 is the risk band*
- [ ] Top bar — no "ARCHIVE" wordmark; breadcrumb still present
- [ ] Notification panel (bell) @320px
- [ ] Avatar dropdown @320px

---

## 3. Student

| Route | Checks |
|---|---|
| `/student` | Heading leading; focus ring on cards |
| `/student/milestone` | Phase headers clear the progress line; no clipping |
| `/student/milestone/[milestone]/chapter-1` | Status callout stacks; upload row stacks; **no Replace button** |
| `/student/my-team` | Member row collapses (crown + activity hidden); **all 6 modals** fit + close button reachable |
| `/student/templates` | Table scrolls horizontally |

**`/student/milestone/[milestone]` landscape** — the 200px rail is hidden below `lg`. Confirm this is acceptable, and that **no milestone navigation exists** on a phone (known, accepted tradeoff).

---

## 4. Coordinator

- [*] `/faculty/my-sections` @375px — toolbar on **one scrollable line**, scrollbar hidden
- [*] Phase filter dropdown — **not clipped** (this was broken; `Filter` is now portaled)
- [ ] `/faculty/my-sections/[id]/teams` — journey tracker; row opens Group Progress drawer
- [ ] `/faculty/my-sections/[id]/students` — table readable
- [ ] `/faculty/my-sections/[id]/milestones` — lock button tappable (34px on mobile)
- [ ] `/faculty/my-sections/[id]/overview` — reference page, was already fine

---

## 5. Faculty

- [ ] `/faculty` — heading leading; focus rings
- [ ] `/faculty/defense` — resubmission table scrolls; defense cards don't truncate
- [ ] `/faculty/defense-scheduling` — **🔴 not yet addressed** (wizard, HTML5 drag-and-drop is touch-dead)
- [ ] `/faculty/defense/[id]/session` — panelist rows
- [ ] `/faculty/defense/[id]/resubmission` — callout + activity feed
- [ ] `/faculty/document-review` — **🔴 not yet addressed** (worst table: clipped, no x-scroll)
- [ ] `/faculty/archiving` — table scrolls; modal fits
- [ ] `/faculty/faculty-management/{members,advisers,coordinators}` — tables; 3× 380px modals
- [ ] `/faculty/templates`, `/faculty/section-management` — duplicates of admin pages

---

## 6. Auth

- [ ] `/login`, `/signup`, `/forgot-password`, `/reset-password` — ≥640px **pixel-identical** to before
- [ ] Same four @375px — card fits, one card only
- [ ] `/reset-password` **without `?token`** — exactly one card, one "Back to login"
- [ ] Each `loading.tsx` (throttle network) — skeleton matches real card
- [ ] `/signup` short viewport — card must not jump when URL bar collapses
- [ ] `/join/[code]` expired card
- [ ] `/guest` @375px — **both** role cards visible; join modal fits; landscape reachable

---

## 7. Account

- [ ] `/account/profile` — **crop round-trip: upload → zoom → drag → save.** Avatar must match what was framed. *Zero test coverage — highest risk item.*
- [ ] `/account/profile` landscape — Save row reachable
- [ ] `/account/profile` — identity header stacks below `sm`
- [ ] `/account/security` — tab all 3 inputs, **visible focus ring**; red border on bad password

---

## 8. Admin / Chair

- [ ] `/admin` — heading leading; gained horizontal padding
- [ ] `/admin/users` — 7-col table; toolbar with 5 controls
- [ ] `/admin/sections`, `/admin/templates` — tables scroll
- [ ] `/admin/audit` — **widest toolbar in the app**; date range stacks; sticky header; drawer diff
- [ ] **All three filters** open without clipping (audit uses `fullWidth`)

---

## 9. Chair dashboard — `/faculty/dashboard`

- [ ] Sidebar shows "Chair Dashboard" **only** for `isProgramChair`
- [ ] Non-chair hitting the URL directly → redirected
- [ ] Numbers match `/faculty/section-management` and `/faculty/faculty-management/advisers`
- [ ] Unassigned column is **red**
- [ ] Defense outcomes render as **columns**; "Redefense Required" label
- [ ] Alerts rows link through; all-clear state shows green not "0"
- [ ] Right rail scrolls internally; **page** scrolls on mobile (no trapped wheel)
- [ ] Greeting callout — greeting only, no counts
- [ ] Calendar — deadline dots; note **chapter deadlines are not a source** (`Milestone` has no due date)

---

## 10. Shared overlays

- [ ] `ActionMenu` kebab @320px — fits
- [ ] `ActionMenu` long menu near bottom edge — flips, stays on screen
- [ ] `Drawer` (side panel) — 480/600px presets degrade to full-bleed
- [ ] `EmptyState` — reduced padding @375px
- [ ] Any modal — no horizontal clipping at 320px

---

## 11. Not yet responsive — expect failures

These are **known unfixed**. Don't report them as regressions.

- [ ] `/faculty/document-review` — clipped table, no x-scroll
- [ ] `/faculty/defense-scheduling` — 700px wizard step; **drag-and-drop is touch-dead**
- [ ] `/calendar` — FullCalendar, 48-row week view, 312 lines of CSS with zero media queries
- [ ] 4 PDF annotation routes — 64px non-wrapping header; hover-only; Ctrl+wheel zoom
- [ ] `…/teams`, `…/students`, 3× faculty-management tables — no x-scroll
- [ ] `/student/milestone/[milestone]` — no mobile milestone nav (accepted)
- [ ] 16 centered modals — several still fixed-width

---

## Quick pass (5 minutes)

1. `/student/milestone` — "Capstone 1" legible
2. `/student/milestone/chapter-1` — callout + upload row stack
3. `/student/my-team` — modals fit
4. `/admin/audit` @375px — toolbar
5. `/faculty/my-sections` — filter dropdown not clipped

---

## Notes

- Baseline for comparison: `c02f724`
- Full per-route analysis lives in `CONTEXT.md` (gitignored, local only — not committed)
- Phase 4 (tables) and Phase 5 (wizard / calendar / PDF) not started
- Unverified items are marked 🔴 or in section 11 — they are known gaps, not regressions
