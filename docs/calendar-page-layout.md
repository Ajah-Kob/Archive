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
| Month grid | `dayGridMonth`; per-event colors (defense type colors; manual events fixed); past events dimmed; today highlighted `#707dff` |
| List view | `listMonth` chronological agenda; same colors; defense times + venues inline |
| Event click | `EventDetailsModal`: title, date span, venue (defenses), description, audience (manual), deep-link button per kind; Edit/Delete inside modal for manual events (chair/admin) |
| Date-span select | Chair/admin only: drag across days → `NewEventModal` prefilled with the span (title, audience, dates) |

## Event colors (existing tokens)

| Category | Color | Treatment | Source |
|---|---|---|---|
| Proposal defense | `#707dff` | 14% tint fill + 1px `#707dff` border, dark text | `DefenseSchedule.type` |
| Final defense | `#fe6f6f` | 14% tint fill + 1px `#fe6f6f` border, dark text | `DefenseSchedule.type` |
| Manual — `NONE` | `#707dff` | solid fill, white text | `CalendarEvent.priority` (default) |
| Manual — `LOW` | `#64748b` | solid fill, white text | `CalendarEvent.priority` |
| Manual — `MEDIUM` | `#b45309` | solid fill, white text | `CalendarEvent.priority` |
| Manual — `HIGH` | `#c2410d` | solid fill, white text | `CalendarEvent.priority` |

Defense pills are tinted + outlined (manual events stay solid) so the two
classes read apart at a glance and proposal vs final are distinguishable. The
tint is `color-mix(in srgb, <color> 14%, white)`, applied as an inline style by
`renderEventContent`; `app/calendar/calendar.css` forces the *outer* FullCalendar
chrome transparent so no theme fill leaks through.

### Priority (manual events only)

Chair/admin set `NONE | LOW | MEDIUM | HIGH` in the event form; the server
resolves the color in `getCalendarFeed` so the client never picks colors. Rules:

- The ramp **deliberately skips red** — `#fe6f6f` already means "Final Defense",
  so a red `HIGH` would be indistinguishable from a final defense.
- `NONE` keeps the neutral indigo, so every pre-existing event is visually
  unchanged after the migration.
- `MEDIUM`/`HIGH` use the 700 steps of the amber/orange ramps, dark enough for
  white text on a solid pill, reusing the app's existing "needs action" family.
- Priority is **not color-only**: the details modal names the level in words
  (shown when it isn't `NONE`) and the audit `after` payload records it.
- Defenses have no priority — their color is type-driven and `priority` is
  `null` on defense feed rows.

> A user-picked event color was designed here once but the `color` column was
> dropped in `20260916000006_drop_calendar_event_color`. Priority is the current
> answer to per-event differentiation.

> Feed scope: defenses (`DefenseSchedule`) + manual events only. Milestone
> openings, submissions, and repository publishes are intentionally excluded —
> `CalendarFeedKind` still declares those kinds, but nothing produces them yet.

## Timezone rule

`DefenseSchedule.startTime`/`endTime` are bare `"HH:mm"` strings with no zone.
They are **Manila wall-clock time**, parsed with an explicit `+08:00` offset in
`combineDefenseDateTime` (`lib/actions/calendar.ts`) and rendered with
`timeZone="Asia/Manila"` in the client. Asia/Manila is UTC+8 with no DST, so a
literal offset is exact.

Never build those datetimes server-locally: the app runs on Vercel (UTC), which
silently shifted every defense by 8 hours and pushed evening defenses into the
wrong day cell. `jest.global-setup.ts` pins the test suite to `TZ=UTC` so this
regression fails locally too — on a Manila machine both parses agree, so the
tests could not otherwise detect it.

## Cache invalidation

The two feed sources are `'use cache'` + `cacheTag('calendar')` + `cacheLife('max')`,
argued in no role so all roles share one entry; role scoping is applied
afterwards in the uncached `getCalendarFeed`.

Ownership lives in `lib/actions/revalidate.ts`:

- `revalidateCalendarCache()` — the single implementation (`revalidateTag('calendar','max')` + `revalidatePath('/calendar')`)
- `revalidateFeature('defense')` calls it, so every schedule/reschedule/verdict
  mutation invalidates the feed **without touching those call sites**
- `revalidateCalendar()` in `calendar.ts` is the chair/admin manual-event path and
  delegates to the same helper

Any new writer that changes what the feed displays must invalidate `calendar`.

## Role matrix

| Capability | Student | Faculty | Coordinator | Chair | Admin |
|---|---|---|---|---|---|
| View calendar | own group | advised groups | own sections | all | all |
| Open event details + deep links | ✅ | ✅ | ✅ | ✅ | ✅ |
| Create / edit / delete events | — | — | — | ✅ | ✅ |

No section filter exists yet — the design called for one for chair/admin but it
was never built. `CalendarScope.sectionIds` was removed rather than left as dead
weight, so adding it means extending the scope resolver again.

## Responsive

- Desktop: full grid + action bar as drawn.
- Mobile: action bar wraps; default to List view under `sm` breakpoint (grid stays available via switcher). The view is not persisted across reloads.

## States

- **Empty** — "No events scheduled — check back soon."
- **Failed load** — the page forwards `getCalendarFeed`'s message and renders it
  in a `role="alert"` line instead. A DB outage must never look like an empty
  calendar. The empty-message case (prerender rejection) deliberately renders no
  error.
- **Unauthorized scope** — "You are not authorized to view the calendar."

## Explicitly out (v1)

Drag-to-reschedule, recurring events, reminders/notifications, a section filter,
and defense scheduling actions (the wizard keeps that job). Week/day views were
originally listed here too, but both shipped.
