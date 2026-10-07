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
        // MUI sizes each day cell as a square from --PickerDay-size, 36px by
        // default, so the seven-column month is wider than the wizard body once
        // the calendar's own padding is added and the step scrolls sideways.
        //
        // The variable has to be overridden on the day element itself, not on
        // this root: PickerDay declares --PickerDay-size on each day, and a
        // custom property set on an element always wins over an inherited one, so
        // setting it here was inert. Note the class is MuiPickerDay, singular --
        // MuiPickersDay does not exist in v9.
        //
        // mx-auto centres the calendar in the body, which only shows once it is
        // narrow enough to have slack to distribute. maxWidth is a backstop so a
        // miscalculation clips rather than reintroducing a scrollbar.
        //
        // MUI computes the weeks-container height from the 36px constant in JS
        // rather than this variable, so shorter cells leave slack at the bottom.
        mx: 'auto',
        maxWidth: '100%',
        '& .MuiPickerDay-root': {
          '@media (max-width: 639px)': {
            '--PickerDay-size': '30px',
          },
        },
      }}
    />
  )
}
