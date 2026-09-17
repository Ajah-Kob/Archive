'use client'

import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import {
  markedDaySlotProps,
  markedDaySlots,
  textFieldSlot,
  type PickerCommonProps,
} from './pickerShared'

interface AppDateRangePickerProps extends PickerCommonProps {
  start: Date | null
  end: Date | null
  onStartChange: (value: Date | null) => void
  onEndChange: (value: Date | null) => void
}

// Start/end date pair in the shared two-column grid. Parents own labels,
// state, and span validation.
export function AppDateRangePicker({
  start,
  end,
  onStartChange,
  onEndChange,
  disabled,
  disablePast,
  markedDays,
}: AppDateRangePickerProps) {
  return (
    <div className="grid grid-cols-2 gap-[12px]">
      <DatePicker
        value={start}
        onChange={onStartChange}
        disabled={disabled}
        disablePast={disablePast}
        slots={markedDaySlots(markedDays)}
        slotProps={{ ...markedDaySlotProps(markedDays), textField: textFieldSlot.textField }}
      />
      <DatePicker
        value={end}
        onChange={onEndChange}
        disabled={disabled}
        disablePast={disablePast}
        slots={markedDaySlots(markedDays)}
        slotProps={{ ...markedDaySlotProps(markedDays), textField: textFieldSlot.textField }}
      />
    </div>
  )
}
