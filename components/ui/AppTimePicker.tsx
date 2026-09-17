'use client'

import { TimePicker } from '@mui/x-date-pickers/TimePicker'
import { textFieldSlot } from './pickerShared'

interface AppTimePickerProps {
  value: Date | null
  onChange: (value: Date | null) => void
  disabled?: boolean
  /** 12h clock. Defaults to true. */
  ampm?: boolean
  /** Disable specific times (e.g. taken slots). */
  shouldDisableTime?: (value: Date, view: 'hours' | 'minutes' | 'seconds') => boolean
}

// Time field. Parents own labels + state (typically "HH:MM" strings anchored
// to a day — see the defense-scheduling wizard).
export function AppTimePicker({
  value,
  onChange,
  disabled,
  ampm = true,
  shouldDisableTime,
}: AppTimePickerProps) {
  return (
    <TimePicker
      value={value}
      onChange={onChange}
      disabled={disabled}
      ampm={ampm}
      shouldDisableTime={shouldDisableTime}
      slotProps={{
        textField: {
          ...textFieldSlot.textField,
          sx: { '& .MuiSvgIcon-root': { fontSize: 18, color: '#9ea8c6' } },
        },
      }}
    />
  )
}
