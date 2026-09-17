'use client'

import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import {
  markedDaySlotProps,
  markedDaySlots,
  textFieldSlot,
  type PickerCommonProps,
} from './pickerShared'

interface AppDatePickerProps extends PickerCommonProps {
  value: Date | null
  onChange: (value: Date | null) => void
}

// Popup date field. Parents own labels + state.
export function AppDatePicker({
  value,
  onChange,
  disabled,
  disablePast,
  markedDays,
}: AppDatePickerProps) {
  return (
    <DatePicker
      value={value}
      onChange={onChange}
      disabled={disabled}
      disablePast={disablePast}
      slots={markedDaySlots(markedDays)}
      slotProps={{ ...markedDaySlotProps(markedDays), textField: textFieldSlot.textField }}
    />
  )
}
