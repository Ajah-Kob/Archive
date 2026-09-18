'use client'

import { TimePicker } from '@mui/x-date-pickers/TimePicker'
import { renderDigitalClockTimeView } from '@mui/x-date-pickers/timeViewRenderers'
import { textFieldSlot } from './pickerShared'

interface AppTimePickerProps {
  value: Date | null
  onChange: (value: Date | null) => void
  disabled?: boolean
  /** 12h clock. Defaults to true. */
  ampm?: boolean
  /** Disable specific times (e.g. taken slots). */
  shouldDisableTime?: (value: Date, view: 'hours' | 'minutes' | 'seconds') => boolean
  /** Render the digital clock list instead of the analog clock face. */
  digitalClock?: boolean
  /** Bound the pickable range (time portion only). */
  minTime?: Date | null
  maxTime?: Date | null
  /** Hide disabled options from the dropdown instead of greying them out. */
  skipDisabled?: boolean
  /** Step between options (e.g. `{ minutes: 30 }` → 6:00, 6:30, 7:00…). */
  timeSteps?: { hours?: number; minutes?: number; seconds?: number }
}

// Time field. Parents own labels + state (typically "HH:MM" strings anchored
// to a day — see the defense-scheduling wizard).
export function AppTimePicker({
  value,
  onChange,
  disabled,
  ampm = true,
  shouldDisableTime,
  digitalClock = false,
  minTime,
  maxTime,
  skipDisabled,
  timeSteps,
}: AppTimePickerProps) {
  return (
    <TimePicker
      value={value}
      onChange={onChange}
      disabled={disabled}
      ampm={ampm}
      shouldDisableTime={shouldDisableTime}
      minTime={minTime ?? undefined}
      maxTime={maxTime ?? undefined}
      skipDisabled={skipDisabled}
      timeSteps={timeSteps}
      viewRenderers={
        digitalClock
          ? {
              hours: renderDigitalClockTimeView,
              minutes: renderDigitalClockTimeView,
              seconds: renderDigitalClockTimeView,
            }
          : undefined
      }
      slotProps={{
        actionBar: { actions: ['accept'] },
        textField: {
          ...textFieldSlot.textField,
          sx: {
            '& .MuiSvgIcon-root': { fontSize: 18, color: '#9ea8c6' },
            '& .MuiPickersOutlinedInput-input': { textAlign: 'center' },
          },
        },
      }}
    />
  )
}
