'use client'

import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker'
import {
  markedDaySlotProps,
  markedDaySlots,
  textFieldSlot,
  type PickerCommonProps,
} from './pickerShared'

interface AppDateTimeRangePickerProps extends PickerCommonProps {
  start: Date | null
  end: Date | null
  onStartChange: (value: Date | null) => void
  onEndChange: (value: Date | null) => void
}

// Start/end datetime pair in the shared two-column grid. Parents own labels,
// state, and span validation.
export function AppDateTimeRangePicker({
  start,
  end,
  onStartChange,
  onEndChange,
  disabled,
  disablePast,
  ampm = true,
  markedDays,
}: AppDateTimeRangePickerProps & { ampm?: boolean }) {
  return (
    <div className="grid grid-cols-2 gap-[12px]">
      <DateTimePicker
        value={start}
        onChange={onStartChange}
        disabled={disabled}
        disablePast={disablePast}
        ampm={ampm}
        slots={markedDaySlots(markedDays)}
        slotProps={{ ...markedDaySlotProps(markedDays), textField: textFieldSlot.textField }}
      />
      <DateTimePicker
        value={end}
        onChange={onEndChange}
        disabled={disabled}
        disablePast={disablePast}
        ampm={ampm}
        slots={markedDaySlots(markedDays)}
        slotProps={{ ...markedDaySlotProps(markedDays), textField: textFieldSlot.textField }}
      />
    </div>
  )
}
