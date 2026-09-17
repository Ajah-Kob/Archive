'use client'

import { PickerDay, type PickerDayProps } from '@mui/x-date-pickers/PickerDay'

export function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

interface MarkedDayProps extends PickerDayProps {
  markedDays?: string[]
}

// Day cell with an optional dot (e.g. dates that already have schedules).
// Defined at module scope so cells don't remount on every render.
export function MarkedDay({ markedDays = [], ...dayProps }: MarkedDayProps) {
  const showDot =
    !dayProps.outsideCurrentMonth && markedDays.includes(dayKey(dayProps.day))
  return (
    <span style={{ position: 'relative', display: 'inline-flex' }}>
      <PickerDay {...dayProps} />
      {showDot ? (
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            bottom: 4,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 4,
            height: 4,
            borderRadius: 9999,
            backgroundColor: '#707dff',
          }}
        />
      ) : null}
    </span>
  )
}

export const textFieldSlot = {
  textField: { size: 'small' as const, fullWidth: true },
}

export function markedDaySlots(markedDays?: string[]) {
  if (markedDays === undefined) return undefined
  return { day: MarkedDay }
}

export function markedDaySlotProps(markedDays?: string[]) {
  if (markedDays === undefined) return undefined
  return { day: { markedDays } as unknown as PickerDayProps }
}

export interface PickerCommonProps {
  disabled?: boolean
  /** Disallow past dates (date modes only). */
  disablePast?: boolean
  /** Day keys (see dayKey) rendered with a dot. Date modes only. */
  markedDays?: string[]
}
