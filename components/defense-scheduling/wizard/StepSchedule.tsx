'use client'

import { useMemo } from 'react'
import { AppDateCalendar } from '@/components/ui/AppDateCalendar'
import { AppTimePicker } from '@/components/ui/AppTimePicker'
import { dayKey } from '@/components/ui/pickerShared'
import { format, isValid } from 'date-fns'
import type { TakenTimeRange } from './types'

// Inline label styling (Schedule & Venue step).
const LABEL_CLASS =
  'font-sans font-bold text-[12px] leading-[18px] text-[#5a6382]'

// Step-specific input styling (Schedule & Venue step).
const SCHEDULE_FIELD_CLASS =
  'w-full h-[42px] px-[14px] bg-white border border-[#e8ebf8] rounded-[10px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.04)] font-sans font-semibold text-[13px] text-[#3d4566] outline-none focus:border-[rgba(112,125,255,0.5)] transition-colors disabled:bg-[#f8f9fd] disabled:text-[#a0a8c4] disabled:cursor-not-allowed'

// "HH:MM" 24h strings compare correctly with a simple string compare.
function timeErrorFor(start: string, end: string): string | null {
  if (start && end && start >= end) {
    return 'End time must be after the start time.'
  }
  return null
}

function timeStringToDate(time: string, base: Date): Date | null {
  const match = /^(\d{2}):(\d{2})/.exec(time)
  if (!match) return null
  const next = new Date(base)
  next.setHours(Number(match[1]), Number(match[2]), 0, 0)
  return next
}

interface StepScheduleProps {
  selectedDate: Date | null
  startTime: string
  endTime: string
  venue: string
  existingDates: Date[]
  /** Taken spans ("HH:MM") on the selected date — those times disable. */
  takenRanges: TakenTimeRange[]
  onDateChange: (date: Date | null) => void
  onStartTimeChange: (value: string) => void
  onEndTimeChange: (value: string) => void
  onVenueChange: (value: string) => void
}

export function StepSchedule({
  selectedDate,
  startTime,
  endTime,
  venue,
  existingDates,
  takenRanges,
  onDateChange,
  onStartTimeChange,
  onEndTimeChange,
  onVenueChange,
}: StepScheduleProps) {
  const timeError = timeErrorFor(startTime, endTime)

  const scheduledDays = useMemo(
    () => existingDates.map(dayKey),
    [existingDates],
  )

  // TimePicker works with Date objects — anchor "HH:MM" strings to the
  // selected day (today when no date is picked yet).
  const timeBase = selectedDate ?? new Date()
  const startValue = timeStringToDate(startTime, timeBase)
  const endValue = timeStringToDate(endTime, timeBase)

  function handleTimeChange(value: Date | null, onChange: (time: string) => void) {
    if (value && isValid(value)) onChange(format(value, 'HH:mm'))
  }

  // Taken minutes on the selected day (half-open [from, to) so a slot ending
  // at 10:00 leaves 10:00 pickable). Hours disable only when fully covered;
  // minutes disable precisely — the clock stays usable around partial hours.
  const takenMinutes = useMemo(() => {
    const toMinutes = (t: string): number | null => {
      const match = /^(\d{2}):(\d{2})/.exec(t)
      if (!match) return null
      return Number(match[1]) * 60 + Number(match[2])
    }
    return takenRanges
      .map((r) => {
        const from = toMinutes(r.start)
        const to = toMinutes(r.end)
        return from != null && to != null && to > from ? { from, to } : null
      })
      .filter((r): r is { from: number; to: number } => r !== null)
  }, [takenRanges])

  function shouldDisableTime(
    value: Date,
    view: 'hours' | 'minutes' | 'seconds',
  ): boolean {
    if (view === 'seconds') return false
    const time = value.getHours() * 60 + value.getMinutes()
    // Taken spans on the selected day.
    const taken = takenMinutes.some(({ from, to }) => {
      if (view === 'hours') {
        const hourStart = value.getHours() * 60
        return from <= hourStart && hourStart + 60 <= to
      }
      return from <= time && time < to
    })
    if (taken) return true
    // Past times — only when the selected day is today (future days keep
    // every time pickable). No date picked yet anchors to today.
    const now = new Date()
    const selectedIsToday =
      !selectedDate || dayKey(selectedDate) === dayKey(now)
    if (!selectedIsToday) return false
    const nowMinutes = now.getHours() * 60 + now.getMinutes()
    if (view === 'hours') {
      const hourStart = value.getHours() * 60
      return hourStart + 60 <= nowMinutes
    }
    return time < nowMinutes
  }

  // Vertical stack (Date → Time → Venue). The wizard modal body scrolls when
  // content overflows, so no local scroll container is needed.
  return (
    <div className="flex flex-col gap-[14px] w-full">
      {/* Date */}
      <div className="flex flex-col gap-[10px]">
        <span className={LABEL_CLASS}>
          Date <span className="text-[#ef4444]">*</span>
        </span>
        <div className="flex w-fit flex-col items-center self-center rounded-[14px] border border-[#e8ebf8] bg-[#fbfcff] px-[10px] pt-[16px] pb-[8px]">
          <AppDateCalendar
            value={selectedDate}
            onChange={onDateChange}
            disablePast
            markedDays={scheduledDays}
          />
        </div>
        <span className="font-sans font-medium text-[11px] leading-[15px] text-[#8a93b4] w-full text-center">
          Dotted dates have scheduled defenses. Check for time conflicts.
        </span>
      </div>

      {/* Time */}
      <div className="grid grid-cols-2 gap-[12px]">
        <div className="flex flex-col gap-[6px]">
          <label className={LABEL_CLASS}>Start Time <span className="text-[#ef4444]">*</span></label>
          <AppTimePicker
            value={startValue}
            onChange={(value) => handleTimeChange(value, onStartTimeChange)}
            shouldDisableTime={shouldDisableTime}
          />
        </div>
        <div className="flex flex-col gap-[6px]">
          <label className={LABEL_CLASS}>End Time <span className="text-[#ef4444]">*</span></label>
          <AppTimePicker
            value={endValue}
            onChange={(value) => handleTimeChange(value, onEndTimeChange)}
            shouldDisableTime={shouldDisableTime}
          />
        </div>
      </div>
      {timeError ? (
        <p className="-mt-[6px] font-sans font-medium text-[11.5px] leading-[17px] text-[#ef4444]">
          {timeError}
        </p>
      ) : null}

      {/* Venue */}
      <div className="flex flex-col gap-[6px]">
        <label className={LABEL_CLASS}>Venue <span className="text-[#ef4444]">*</span></label>
        <input
          type="text"
          value={venue}
          onChange={(e) => onVenueChange(e.target.value)}
          placeholder="e.g. Room 204, New Building"
          maxLength={120}
          className={SCHEDULE_FIELD_CLASS}
        />
      </div>
    </div>
  )
}
