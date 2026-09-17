'use client'

import { DateCalendar } from '@mui/x-date-pickers/DateCalendar'
import {
  markedDaySlotProps,
  markedDaySlots,
  type PickerCommonProps,
} from './pickerShared'

interface AppDateCalendarProps extends PickerCommonProps {
  value: Date | null
  onChange: (value: Date | null) => void
}

// Always-visible month grid (e.g. wizard side calendar). Parents own
// labels + state.
export function AppDateCalendar({
  value,
  onChange,
  disabled,
  disablePast,
  markedDays,
}: AppDateCalendarProps) {
  return (
    <DateCalendar
      value={value}
      onChange={onChange}
      disabled={disabled}
      disablePast={disablePast}
      slots={markedDaySlots(markedDays)}
      slotProps={markedDaySlotProps(markedDays)}
    />
  )
}
