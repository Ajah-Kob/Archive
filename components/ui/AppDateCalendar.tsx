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
      sx={{
        // MUI sizes each day cell from --PickerDay-size (36px by default), so a
        // seven-column month is ~280px before the calendar's own padding. The
        // wizard body has ~287px at 375px, which the grid tipped over, and the
        // step scrolled sideways. Overriding the variable the cells size
        // themselves from tightens only the narrow layout and leaves desktop on
        // MUI's own default.
        //
        // Note: MUI computes the weeks-container height from the same 36px
        // constant in JS, not from this variable, so the shorter cells leave a
        // little slack at the bottom. That is the cheaper trade against a
        // horizontally scrolling calendar.
        '@media (max-width: 639px)': {
          '--PickerDay-size': '30px',
        },
      }}
    />
  )
}
