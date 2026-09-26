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

## Event colors

### Defenses — a palette preset, chosen by type

| Category | Palette key | Fill | Label |
|---|---|---|---|
| Proposal defense | `default` (Purple) | `#c7d2fe` | `#1e3a8a` |
| Final defense | `0` (Rose) | `#fecdd3` | `#881337` |

Defense types map onto `SECTION_HEADER_PALETTE` on the server
(`defensePresetFor`), so a defense chip is the **same construct** as a manual
event — same fill, same label tone, same hover ring. The client chooses the
treatment per view:

| View | Defense treatment |
|---|---|
| Week / Day | filled palette chip, identical to a manual event |
| Month | bare dark-ink text preceded by a **saturated 7px dot** |
| List | no pill of its own; FullCalendar's time column carries the time |

Month stays chrome-free so a busy day cell doesn't turn into a wall of chips;
week/day fills the chip because a bare text line inside a timed block reads as
an empty slot.

### The month marker

The palette's pastel `bg` tone is invisible at dot size on the grid, so a
month defense's marker uses the **saturated `dot` tone** from the same preset —
`#818cf8` for Proposal, `#fb7185` for Final — which is also the swatch the
section and event pickers show. The server carries it as `markerColor`
(`preset.dot`), so the client never reaches into the palette for color.

The marker is our own `<span class="fc-defense-marker">` rather than the theme's:
the classic theme draws markers as a *dotted border* in the event's fill tone,
which is why the previous attempt was barely visible. Ours is `aria-hidden`
(the title already says "Defense") and appears only on the fill-less month row —
a filled week/day chip needs no marker, and manual events never get one.

**Accepted trade-off:** a Proposal defense and a default-coloured manual event
are now the same fill, as are a Final defense and a Rose manual event. The hue
no longer distinguishes *system* from *chair-created*, nor proposal from final —
the title does (`Proposal Defense — Team 5`). A test asserts the type still
appears in the title.

### Manual events — driven by a palette key

Manual events pick from `SECTION_HEADER_PALETTE` (`lib/sectionHeader.ts`) — the
same six header presets the **section cards** use, so the calendar and the
sections read as one system. Each preset supplies a light `bg` for the fill and
a dark `text` for the label; the picker (`components/ui/ColorKeyPicker.tsx`,
shared with the section form so the two can't drift) shows the saturated `dot`
tone.

| Preset | `key` | Fill (`bg`) | Label (`text`) |
|---|---|---|---|
| Purple *(default)* | `default` | `#c7d2fe` | `#1e3a8a` |
| Rose | `0` | `#fecdd3` | `#881337` |
| Amber | `1` | `#fde68a` | `#78350f` |
| Mint | `2` | `#a7f3d0` | `#065f46` |
| Sky | `3` | `#bae6fd` | `#0c4a6e` |
| Peach | `4` | `#fed7aa` | `#7c2d12` |

`CalendarEvent.colorKey` stores the **key**, not a hex: validation is then a
fixed list, and a palette change propagates without a data migration. `NULL`
means the palette default (Purple).

Rules:

- The server resolves both tones in `getCalendarFeed`; the client never picks a
  color. `textColor` is part of the feed event because the label tone varies per
  preset.
- No manual preset collides with a defense color — `#fe6f6f` and `#707dff` stay
  exclusively type meanings. A test asserts this.
- A `NULL` or unrecognized `colorKey` degrades to the Purple default rather than
  rendering an uncolored pill.
- The choice is **not color-only**: the details modal names the preset in words
  when one is set, and the audit `after` payload records the key.
- Defenses carry `colorKey: null` and are unaffected by any of this.

> Earlier iterations: a user-picked color column was dropped in
> `20260916000006_drop_calendar_event_color`, and a
> `priority` (NONE/LOW/MEDIUM/HIGH) column was added then removed in
> `20260926000003_calendar_event_color` — the client chose a plain palette color
> instead. The `feature/calendar-event-priority` branch keeps that version.

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
