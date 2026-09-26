'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { HeaderBar } from '@/components/globals/HeaderBar'
import { type FilterOption } from '@/components/ui/Filter'
import { EventDetailsModal } from '@/components/calendar/EventDetailsModal'
import {
  NewEventModal,
  EditEventModal,
} from '@/components/calendar/NewEventModal'
import dayGridPlugin from '@fullcalendar/react/daygrid'
import listPlugin from '@fullcalendar/react/list'
import timeGridPlugin from '@fullcalendar/react/timegrid'
import interactionPlugin from '@fullcalendar/react/interaction'
import classicThemePlugin from '@fullcalendar/react/themes/classic'
import type {
  CalendarRef,
  DateClickInfo,
  DateSelectInfo,
  EventClickInfo,
  EventDisplayInfo,
  MountInfo,
} from '@fullcalendar/react'
import type { CalendarFeedEvent } from '@/lib/actions/calendar'

// FullCalendar touches the DOM on mount, so it loads client-only behind a
// skeleton — the server page (and its prerender) never executes it.
const FullCalendar = dynamic(
  () => import('@fullcalendar/react').then((mod) => mod.default),
  { ssr: false, loading: () => <CalendarSkeleton /> },
)

const MONTH_VIEW = 'dayGridMonth'
const LIST_VIEW = 'listMonth'
const WEEK_VIEW = 'timeGridWeek'
const DAY_VIEW = 'timeGridDay'
const MOBILE_BREAKPOINT = '(max-width: 639px)'

const CALENDAR_PLUGINS = [
  classicThemePlugin,
  dayGridPlugin,
  listPlugin,
  timeGridPlugin,
  interactionPlugin,
]

const VIEW_OPTIONS: FilterOption[] = [
  { value: MONTH_VIEW, label: 'Month' },
  { value: WEEK_VIEW, label: 'Week' },
  { value: DAY_VIEW, label: 'Day' },
  { value: LIST_VIEW, label: 'List' },
]

// FullCalendar's content callback receives no view information, so the active
// view is passed in by the caller (kept fresh through a ref, see
// CalendarClient). The time prefix is redundant in the time-grid views — an
// event's vertical position already encodes the hour — so it is dropped there
// and kept in month, where a day cell carries no time cue. The list view is
// unaffected either way: FullCalendar leaves timeText empty for it and prints
// the time in its own column.
const VIEWS_WITHOUT_TIME_PREFIX = new Set([WEEK_VIEW, DAY_VIEW])

// Custom event rendering: owns the pill DOM entirely so no theme tint,
// opacity, or foreground rule can interfere.
// Defined at module scope so FullCalendar never remounts content on re-render.
const renderEventContent = (
  arg: EventDisplayInfo,
  viewType: string,
): React.ReactNode => {
  // NOTE: read the color from OUR feed object in extendedProps — v7 resolves
  // EventDisplayInfo.color through the theme, which masks per-event colors.
  // The feed color is authoritative (verified stored correctly in the DB).
  const feed = arg.event.extendedProps.feed as CalendarFeedEvent | undefined
  const raw = feed?.color
  // Every feed event carries a resolved color; this is a defensive default for
  // a malformed event, not a real palette entry.
  const color = typeof raw === 'string' && raw !== '' ? raw : '#707dff'
  // Defenses get a tinted wash + a hairline in their own color, so proposal
  // (indigo) and final (red) are finally distinguishable from each other.
  // Manual events stay solid with white text, which keeps the two classes
  // readable apart at a glance.
  const isDefense = feed?.kind === 'defense'
  const showTime = arg.timeText && !VIEWS_WITHOUT_TIME_PREFIX.has(viewType)
  return (
    <span
      className="fc-custom-event"
      style={
        isDefense
          ? {
              backgroundColor: `color-mix(in srgb, ${color} 14%, white)`,
              border: `1px solid ${color}`,
              color: '#10133a',
            }
          : { backgroundColor: color, color: '#FFFFFF' }
      }
    >
      {showTime ? <b>{arg.timeText} </b> : null}
      <span>{arg.event.title}</span>
    </span>
  )
}

// Forces the theme variable to OUR feed color on the real element, so every
// theme-driven bit (outer tint wash, dots, list markers) agrees with the
// custom inner pill. Also stamps a hover tooltip summarizing the event.
// Defined at module scope like renderEventContent.
function handleEventMount(info: MountInfo<EventDisplayInfo>) {
  const feed = info.event.extendedProps.feed as CalendarFeedEvent | undefined
  const raw = feed?.color
  if (typeof raw === 'string' && raw !== '') {
    info.el.style.setProperty('--fc-event-color', raw)
  }
  if (feed) {
    const extra = feed.description ? `\n${feed.description}` : ''
    info.el.setAttribute('title', `${feed.title}\n${formatFeedSpan(feed)}${extra}`)
  }
}

// Short human span for tooltips: single day (with times when timed) or range.
function formatFeedSpan(feed: CalendarFeedEvent): string {
  const start = new Date(feed.start)
  const end = new Date(feed.end)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return feed.start
  const dateFmt = (d: Date) =>
    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  const timeFmt = (d: Date) =>
    d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  const sameDay = start.toDateString() === end.toDateString()
  if (sameDay) {
    return feed.allDay ? dateFmt(start) : `${dateFmt(start)} · ${timeFmt(start)}–${timeFmt(end)}`
  }
  return `${dateFmt(start)} – ${dateFmt(end)}`
}

// Date span selected on the grid — subtask 06 feeds this into NewEventModal.
export interface CalendarDateSpan {
  startStr: string
  endStr: string
  allDay: boolean
}

interface CalendarClientProps {
  events: CalendarFeedEvent[]
  canManage?: boolean
  // Set when the feed failed (DB error, or no scope for this account). Kept
  // distinct from "genuinely no events" so an outage never reads as an empty
  // calendar. Null/omitted means the load succeeded.
  loadError?: string | null
}

// Single-day span for the + New Event button (no grid selection involved).
function todaySpan(): CalendarDateSpan {
  const now = new Date()
  const day = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  return { startStr: day, endStr: day, allDay: true }
}

function CalendarSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="animate-pulse rounded-[10px] border border-[#e8ebf8] bg-[#f4f6ff] h-[420px]"
    />
  )
}

function CalendarViewSwitcher({
  view,
  onChange,
}: {
  view: string
  onChange: (view: string) => void
}) {
  // WAI-ARIA tabs pattern: arrow keys move between tabs, Home/End jump to the
  // ends. Without this the tablist is reachable by Tab but not navigable.
  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const keys = ['ArrowLeft', 'ArrowRight', 'Home', 'End']
    if (!keys.includes(event.key)) return

    const currentIndex = VIEW_OPTIONS.findIndex((option) => option.value === view)
    if (currentIndex === -1) return

    event.preventDefault()
    let nextIndex = currentIndex
    if (event.key === 'ArrowLeft') {
      nextIndex = (currentIndex - 1 + VIEW_OPTIONS.length) % VIEW_OPTIONS.length
    } else if (event.key === 'ArrowRight') {
      nextIndex = (currentIndex + 1) % VIEW_OPTIONS.length
    } else if (event.key === 'Home') {
      nextIndex = 0
    } else {
      nextIndex = VIEW_OPTIONS.length - 1
    }

    const next = VIEW_OPTIONS[nextIndex]
    onChange(next.value)
    // Move focus with the selection so the roving focus stays in sync.
    const tablist = event.currentTarget
    const tabs = tablist.querySelectorAll<HTMLButtonElement>('[role="tab"]')
    tabs[nextIndex]?.focus()
  }

  return (
    <div
      role="tablist"
      aria-label="Calendar view"
      onKeyDown={handleKeyDown}
      className="flex items-center h-[37.5px] px-[5px] py-[6px] bg-white border border-[#e8ebf8] rounded-lg gap-[2px] shrink-0"
    >
      {VIEW_OPTIONS.map((option) => {
        const active = option.value === view
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(option.value)}
            className={
              active
                ? 'h-[25.5px] px-[12px] rounded-[7px] bg-[#707dff] text-white shadow-[0px_2px_5px_rgba(112,125,255,0.25)] font-sans font-semibold text-[13px] transition-colors focus:outline-none focus:ring-2 focus:ring-[rgba(112,125,255,0.45)]'
                : 'h-[25.5px] px-[12px] rounded-[7px] text-[#5a6382] hover:bg-[#f4f6ff] font-sans font-semibold text-[13px] transition-colors focus:outline-none focus:ring-2 focus:ring-[rgba(112,125,255,0.25)]'
            }
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

export function CalendarClient({
  events,
  canManage = false,
  loadError = null,
}: CalendarClientProps) {
  const calendarRef = useRef<CalendarRef | null>(null)
  const [view, setView] = useState(MONTH_VIEW)
  const [title, setTitle] = useState('')
  const [isCurrentPeriod, setIsCurrentPeriod] = useState(true)
  // Modal targets — null = closed. Draft span doubles as the NewEventModal
  // open flag so read-only roles (which never set it) never render the modal.
  const [selectedEvent, setSelectedEvent] = useState<CalendarFeedEvent | null>(null)
  const [draftSpan, setDraftSpan] = useState<CalendarDateSpan | null>(null)
  const [editingEvent, setEditingEvent] = useState<CalendarFeedEvent | null>(null)
  // Gates the FullCalendar mount until after hydration so the mobile
  // list-default can be picked without a server/client mismatch (the server
  // always renders the skeleton).
  const [ready, setReady] = useState(false)

  // Mobile defaults to the agenda list; the month grid stays one tap away
  // in the view dropdown.
  useEffect(() => {
    if (window.matchMedia(MOBILE_BREAKPOINT).matches) setView(LIST_VIEW)
    setReady(true)
  }, [])

  // renderEventContent needs the active view but must keep a stable identity,
  // or FullCalendar tears down and rebuilds every event pill on each switch.
  // A ref carries the current value; the callback identity never changes.
  const viewRef = useRef(view)
  useEffect(() => {
    viewRef.current = view
  }, [view])
  const eventContent = useCallback(
    (arg: EventDisplayInfo) => renderEventContent(arg, viewRef.current),
    [],
  )

  // Per-event colors come straight from the feed — never recolored here.
  // No textColor: renderEventContent owns the pill's foreground (dark text on
  // the tinted defense pills, white on solid manual ones), so a single
  // feed-level text color would be wrong for one of the two variants.
  const fcEvents = useMemo(
    () =>
      events.map((event) => ({
        id: event.id,
        title: event.title,
        start: event.start,
        end: event.end,
        allDay: event.allDay,
        backgroundColor: event.color,
        borderColor: event.color,
        extendedProps: { feed: event },
      })),
    [events],
  )

  function switchView(next: string) {
    setView(next)
    calendarRef.current?.getApi().changeView(next)
  }

  function goPrev() {
    calendarRef.current?.getApi().prev()
  }

  function goNext() {
    calendarRef.current?.getApi().next()
  }

  function goToday() {
    calendarRef.current?.getApi().today()
  }

  function handleDatesSet(arg: {
    view: { title: string }
    start: Date
    end: Date
  }) {
    setTitle(arg.view.title)
    const now = new Date()
    setIsCurrentPeriod(arg.start <= now && now < arg.end)
  }

  // Clicking a day background drills into Day view (read-only roles included;
  // span-select creation still belongs to canManage).
  function handleDateClick(clickInfo: DateClickInfo) {
    const api = calendarRef.current?.getApi()
    if (!api) return
    api.changeView(DAY_VIEW)
    api.gotoDate(clickInfo.date)
    setView(DAY_VIEW)
  }

  function handleEventClick(clickInfo: EventClickInfo) {
    clickInfo.jsEvent.preventDefault()
    const feed = clickInfo.event.extendedProps.feed as
      | CalendarFeedEvent
      | undefined
    if (!feed) return
    setSelectedEvent(feed)
  }

  function handleSelect(selectInfo: DateSelectInfo) {
    setDraftSpan({
      startStr: selectInfo.startStr,
      endStr: selectInfo.endStr,
      allDay: selectInfo.allDay,
    })
    calendarRef.current?.getApi().unselect()
  }

  function handleEditFromDetails(feed: CalendarFeedEvent) {
    setSelectedEvent(null)
    setEditingEvent(feed)
  }

  return (
    <>
      <HeaderBar
        actions={
          canManage ? (
            <button
              type="button"
              onClick={() => setDraftSpan(todaySpan())}
              className="flex items-center gap-1.5 h-[37.5px] px-[14px] bg-[#707dff] text-white rounded-lg font-sans font-semibold text-[13px] shadow-[0px_2px_5px_rgba(112,125,255,0.25)] hover:bg-[#5565ff] active:scale-[0.98] transition-all shrink-0"
            >
              <Plus className="size-4" strokeWidth={2} />
              <span className="whitespace-nowrap">New Event</span>
            </button>
          ) : undefined
        }
      >
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={goPrev}
                aria-label="Previous period"
                className="flex items-center justify-center size-[37.5px] bg-white border border-[#e8ebf8] rounded-lg text-[#5a6382] hover:bg-[#f4f6ff] hover:text-[#707dff] hover:border-[#d5dbff] active:scale-[0.98] transition-colors shrink-0"
              >
                <ChevronLeft className="size-4" strokeWidth={2} />
              </button>
              <button
                type="button"
                onClick={goNext}
                aria-label="Next period"
                className="flex items-center justify-center size-[37.5px] bg-white border border-[#e8ebf8] rounded-lg text-[#5a6382] hover:bg-[#f4f6ff] hover:text-[#707dff] hover:border-[#d5dbff] active:scale-[0.98] transition-colors shrink-0"
              >
                <ChevronRight className="size-4" strokeWidth={2} />
              </button>
            </div>
            <button
              type="button"
              onClick={goToday}
              disabled={isCurrentPeriod}
              className="flex items-center justify-center h-[37.5px] px-[14px] bg-white border border-[#e8ebf8] rounded-lg font-sans font-semibold text-[13px] text-[#5a6382] hover:bg-[#f4f6ff] hover:text-[#707dff] hover:border-[#d5dbff] active:scale-[0.98] transition-colors shrink-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:text-[#5a6382] disabled:hover:border-[#e8ebf8] disabled:active:scale-100"
            >
              Today
            </button>
          </div>
          <CalendarViewSwitcher view={view} onChange={switchView} />
        </div>
      </HeaderBar>

      <div className="flex flex-col flex-1 min-h-0 p-4 sm:p-8 bg-[#f8f9fe] bg-[radial-gradient(circle,#dbe0f3_1px,transparent_1px)] bg-[size:22px_22px] gap-4 overflow-y-auto">
        <div className="bg-white border border-[#e8ebf8] rounded-[14px] shadow-[0_2px_12px_rgba(30,58,138,0.04)] p-4 sm:p-6 w-full">
          <div className="flex items-center justify-center pb-1">
            <span
              aria-live="polite"
              className="font-heading font-bold text-[15px] leading-[22px] text-[#10133a] whitespace-nowrap"
            >
              {title}
            </span>
          </div>
          {loadError ? (
            <p
              role="alert"
              className="text-center font-sans font-semibold text-[13px] leading-[20px] text-[#e11d48] pb-3"
            >
              {loadError}
            </p>
          ) : events.length === 0 ? (
            <p className="text-center font-sans font-medium text-[13px] leading-[20px] text-[#8a93b4] pb-3">
              No events scheduled — check back soon.
            </p>
          ) : null}
          <div className="calendar-scope">
            {ready ? (
              <FullCalendar
                ref={calendarRef}
                    plugins={CALENDAR_PLUGINS}
                    initialView={view}
                    headerToolbar={false}
                    datesSet={handleDatesSet}
                    firstDay={1}
                    timeZone="Asia/Manila"
                    nowIndicator
                    events={fcEvents}
                    eventContent={eventContent}
                    eventDidMount={handleEventMount}
                    eventClick={handleEventClick}
                    dateClick={handleDateClick}
                selectable={canManage}
                selectMirror={canManage}
                selectMinDistance={8}
                select={canManage ? handleSelect : undefined}
                    height="auto"
                    // MUST stay a number, not the `dayMaxEvents` boolean
                    // shorthand. A boolean resolves FullCalendar's day-grid
                    // placement mode to 'auto', which mounts a hidden
                    // measurement node carrying `inert: ''` — React 19 rejects
                    // empty-string boolean attributes and logs
                    // "Received an empty string for a boolean attribute
                    // `inert`". A numeric cap resolves the mode to
                    // 'maxEvents', so that probe is never rendered.
                    // Side effect: days cap at a fixed 3 + "+N more" instead
                    // of collapsing by measured height.
                    dayMaxEvents={3}
                    tableHeaderSticky={false}
                  />
            ) : (
              <CalendarSkeleton />
            )}
          </div>
        </div>
      </div>

      {selectedEvent ? (
        <EventDetailsModal
          event={selectedEvent}
          canManage={canManage}
          onClose={() => setSelectedEvent(null)}
          onEdit={handleEditFromDetails}
        />
      ) : null}

      {/* Span-select + edit modals never render for read-only roles. */}
      {canManage ? (
        <NewEventModal span={draftSpan} onClose={() => setDraftSpan(null)} />
      ) : null}

      {canManage ? (
        <EditEventModal event={editingEvent} onClose={() => setEditingEvent(null)} />
      ) : null}
    </>
  )
}

export default CalendarClient
