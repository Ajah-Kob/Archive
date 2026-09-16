# `/calendar` Page Layout

> Decision log: FullCalendar v7 (month + list + interaction) for this page only;
> DayPicker stays in the defense-scheduling wizard. All roles except guest.
> Chair/admin create events; students/faculty/coordinators read-only (scoped).
> Defense scheduling stays in the wizard — calendar is view + deep links
> (extensible later).

## Wireframe

```
┌────────────────────────────────────────────────────────────────┐
│ PageLabel: Calendar                                            │
│ HeaderBar                                                      │
│  [Month | List]  [Category ▾]  [Section ▾]*   [+ New Event]**   │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│   ┌────────────────────────────────────────────────────────┐   │
│   │              FullCalendar month grid                   │   │
│   │                                                        │   │
│   │   Mon 12 ──● Proposal Defense (BSIS 4A)                │   │
│   │   Wed 14 ━━━ Chapter 3 window (Oct 1–14)               │   │
│   │   Fri 16 ──● Manuscript deadline                      │   │
│   │                                                        │   │
│   │   (List view swaps the grid: chronological agenda)     │   │
│   └────────────────────────────────────────────────────────┘   │
│                                                                │
│   Legend: ● Defense  ● Milestone  ● Deadline  ● Custom         │
└────────────────────────────────────────────────────────────────┘
 *  Section filter: chair/admin only (others locked to own scope)
 ** New Event button: chair/admin only (never rendered for others)
```

## Regions

| Region | Contents |
|---|---|
| Action bar (HeaderBar) | View switcher (Month/List), category filter, section filter (chair/admin), **New Event** button (chair/admin) |
| Month grid | `dayGridMonth`; event bars/dots colored by category; past events dimmed; today highlighted `#707dff` |
| List view | `listMonth` chronological agenda; same colors; defense times + venues inline |
| Legend | Fixed row under the grid: Defense / Milestone / Deadline / Custom |
| Event click | `EventDetailsModal`: title, date span, category chip, venue (defenses), description, deep-link button (defense page / milestone page / repository item); Edit/Delete inside modal for manual events (chair/admin) |
| Date-span select | Chair/admin only: drag across days → `NewEventModal` prefilled with the span (title, category, section/program scope) |

## Event colors (existing tokens)

| Category | Color | Source |
|---|---|---|
| Proposal defense | `#707dff` | `DefenseSchedule` type + verdict |
| Final defense | `#fe6f6f` | `DefenseSchedule` type + verdict |
| Milestone opened / submitted / reviewed | `#22c55e` / `#f59e0b` | `MilestoneAvailability` / `MilestoneSubmission` |
| Deadline (manual) | `#f59e0b` | `CalendarEvent` (new model) |
| Custom (manual) | `#a178cd` | `CalendarEvent` (new model) |

## Role matrix

| Capability | Student | Faculty | Coordinator | Chair | Admin |
|---|---|---|---|---|---|
| View calendar | own group | advised groups | own sections | all | all |
| Open event details + deep links | ✅ | ✅ | ✅ | ✅ | ✅ |
| Create / edit / delete events | — | — | — | ✅ | ✅ |
| Section filter | — | — | — | ✅ | ✅ |

## Responsive

- Desktop: full grid + action bar as drawn.
- Mobile: action bar wraps; default to List view under `sm` breakpoint (grid stays available via switcher).

## Explicitly out (v1)

Week/day views, drag-to-reschedule, recurring events, reminders/notifications,
defense scheduling actions (wizard keeps that job).
