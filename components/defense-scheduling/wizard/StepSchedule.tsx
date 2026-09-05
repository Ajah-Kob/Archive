'use client'

import { Calendar } from 'lucide-react'
import { DayPicker } from 'react-day-picker'
import { enUS } from 'react-day-picker/locale'
import 'react-day-picker/style.css'
import type { ClassNames } from 'react-day-picker'

// Inline label styling (Schedule & Venue step).
const LABEL_CLASS =
  'font-sans font-bold text-[12px] leading-[18px] text-[#5a6382]'

// Step-specific input styling (Schedule & Venue step).
const SCHEDULE_FIELD_CLASS =
  'w-full h-[42px] px-[14px] bg-white border border-[#e8ebf8] rounded-[10px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.04)] font-sans font-semibold text-[13px] text-[#3d4566] outline-none focus:border-[rgba(112,125,255,0.5)] transition-colors disabled:bg-[#f8f9fd] disabled:text-[#a0a8c4] disabled:cursor-not-allowed'

// react-day-picker v10: base classes are preserved so the stylesheet keeps its
// layout; utilities only restyle typography and the accent color. Font sizes
// are scaled ~20% down to match the reduced --rdp-day-size.
const DAY_PICKER_CLASS_NAMES: Partial<ClassNames> = {
  month_caption:
    "rdp-month_caption font-['Sora',sans-serif] font-bold text-[12px] tracking-[-0.12px] text-[#1e3a8a]",
  weekday:
    'rdp-weekday font-sans font-semibold text-[9px] uppercase tracking-[0.06em] text-[#8a93b4]',
  day: 'rdp-day font-sans font-medium text-[11px] text-[#10133a]',
  day_button:
    'rdp-day_button rounded-lg hover:bg-[rgba(112,125,255,0.12)] hover:text-[#5a6382] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#707dff]',
  selected: 'rdp-selected',
  today: 'rdp-today text-[#707dff] font-bold',
}

const SCHEDULED_DAY_CLASS =
  "relative font-bold text-[#707dff] after:content-[''] after:absolute after:bottom-[4px] after:left-1/2 after:-translate-x-1/2 after:size-[4px] after:rounded-full after:bg-[#707dff]"

function formatDisplayDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

// "HH:MM" 24h strings compare correctly with a simple string compare.
function timeErrorFor(start: string, end: string): string | null {
  if (start && end && start >= end) {
    return 'End time must be after the start time.'
  }
  return null
}

interface StepScheduleProps {
  selectedDate: Date | null
  startTime: string
  endTime: string
  venue: string
  existingDates: Date[]
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
  onDateChange,
  onStartTimeChange,
  onEndTimeChange,
  onVenueChange,
}: StepScheduleProps) {
  const timeError = timeErrorFor(startTime, endTime)

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 items-start">
      {/* Left column: calendar */}
      <div className="flex flex-col gap-[10px] w-fit">
        <div className="flex w-fit flex-col items-center self-start rounded-[14px] border border-[#e8ebf8] bg-[#fbfcff] px-[20px] py-[16px]">
          <DayPicker
            mode="single"
            selected={selectedDate ?? undefined}
            onSelect={(date) => onDateChange(date ?? null)}
            locale={enUS}
            disabled={{ before: new Date() }}
            modifiers={{ scheduled: existingDates }}
            modifiersClassNames={{ scheduled: SCHEDULED_DAY_CLASS }}
            className="defense-calendar m-auto [--rdp-accent-color:#707dff] [--rdp-accent-background-color:#eef0ff] [--rdp-today-color:#707dff] [--rdp-day_button-border-radius:10px] [--rdp-day-width:36px] [--rdp-day-height:36px] [--rdp-day_button-width:34px] [--rdp-day_button-height:34px] [--rdp-nav_button-width:1rem] [--rdp-nav_button-height:1rem] [--rdp-nav-height:1rem]"
            classNames={DAY_PICKER_CLASS_NAMES}
          />
        </div>
      </div>

      {/* Right column: date + time + venue */}
      <div className="flex flex-col gap-[14px]">
        <div className="flex flex-col gap-[6px]">
          <label className={LABEL_CLASS}>Date</label>
          <div className="relative">
            <Calendar className="pointer-events-none absolute left-[14px] top-1/2 -translate-y-1/2 size-[14px] text-[#8a93b4]" />
            <input
              type="text"
              readOnly
              value={selectedDate ? formatDisplayDate(selectedDate) : ''}
              placeholder="Pick a date in the calendar"
              className={`${SCHEDULE_FIELD_CLASS} pl-[38px] cursor-default`}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-[12px]">
          <div className="flex flex-col gap-[6px]">
            <label className={LABEL_CLASS}>Start Time</label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => onStartTimeChange(e.target.value)}
              className={SCHEDULE_FIELD_CLASS}
            />
          </div>
          <div className="flex flex-col gap-[6px]">
            <label className={LABEL_CLASS}>End Time</label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => onEndTimeChange(e.target.value)}
              className={SCHEDULE_FIELD_CLASS}
            />
          </div>
        </div>
        {timeError ? (
          <p className="-mt-[6px] font-sans font-medium text-[11.5px] leading-[17px] text-[#ef4444]">
            {timeError}
          </p>
        ) : null}

        <div className="flex flex-col gap-[6px]">
          <label className={LABEL_CLASS}>Venue</label>
          <input
            type="text"
            value={venue}
            onChange={(e) => onVenueChange(e.target.value)}
            placeholder="e.g. Room 204, New Building"
            maxLength={120}
            className={SCHEDULE_FIELD_CLASS}
          />
        </div>

        <span className="font-sans font-medium text-[11px] leading-[15px] text-[#8a93b4]">
          Dotted dates have scheduled defenses. Check for time conflicts.
        </span>
      </div>
    </div>
  )
}
