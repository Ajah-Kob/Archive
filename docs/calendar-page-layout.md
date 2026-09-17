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
│  [<] [>] [Today]  [Month | Week | Day | List]   [+ New Event]*    │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│   ┌────────────────────────────────────────────────────────┐   │
│   │                   September 2026                       │   │
│   │   Mon 12 ──● Proposal Defense (BSIS 4A)                │   │
│   │   Wed 14 ━━━ Defense Week (custom span)                │   │
│   │   Fri 16 ──● Manuscript deadline                      │   │
│   │                                                        │   │
│   │   (List/Week/Day views swap the grid)                  │   │
│   └────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────┘
 *  New Event button: chair/admin only (never rendered for others)
```

## Regions

| Region | Contents |
|---|---|
| Action bar (HeaderBar) | Prev/next/Today buttons, segmented view switcher (Month/Week/Day/List), **New Event** button (chair/admin) |
| Month grid | `dayGridMonth`; per-event colors (defense type colors; manual events user-picked); past events dimmed; today highlighted `#707dff` |
| List view | `listMonth` chronological agenda; same colors; defense times + venues inline |
| Event click | `EventDetailsModal`: title, date span, venue (defenses), description, audience (manual), deep-link button per kind; Edit/Delete inside modal for manual events (chair/admin) |
| Date-span select | Chair/admin only: drag across days → `NewEventModal` prefilled with the span (title, audience, dates) |

## Event colors (existing tokens)

| Category | Color | Source |
|---|---|---|
| Proposal defense | `#707dff` | `DefenseSchedule` type + verdict |
| Final defense | `#fe6f6f` | `DefenseSchedule` type + verdict |
| Manual event | user-picked | `CalendarEvent.color` (chair/admin-chosen swatch; `#a178cd` fallback for pre-color rows) |

> Feed scope: defenses (`DefenseSchedule`) + manual events only. Milestone
> openings, submissions, and repository publishes are intentionally excluded.

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
