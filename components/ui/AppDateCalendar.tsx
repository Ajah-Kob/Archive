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
        // MUI sizes each day cell as a square from --PickerDay-size (36px by
        // default), so the seven-column month comes out narrower than the wizard
        // body once the calendar's own padding is added. The grid is left-aligned
        // against that padding, which read as off-centre in the modal. Centring it
        // is a one-line fix and costs no width -- mx-auto distributes the leftover
        // rather than adding to it.
        //
        // Width, not alignment, was what made the step scroll sideways; that was
        // fixed by shrinking the cells below sm.
        mx: 'auto',
        '@media (max-width: 639px)': {
          '--PickerDay-size': '30px',
        },
      }}
    />
  )
}
