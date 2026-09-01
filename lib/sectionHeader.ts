// 6 header presets — default purple included in palette (no separate DEFAULT_HEADER)
export const SECTION_HEADER_PALETTE = [
  { key: 'default', label: 'Purple', bg: '#c7d2fe', border: '#a5b4fc', dot: '#818cf8', text: '#1e3a8a', code: '#4338ca' },
  { key: '0', label: 'Rose',  bg: '#fecdd3', border: '#fda4af', dot: '#fb7185', text: '#881337', code: '#be123c' },
  { key: '1', label: 'Amber', bg: '#fde68a', border: '#fcd34d', dot: '#f59e0b', text: '#78350f', code: '#92400e' },
  { key: '2', label: 'Mint',  bg: '#a7f3d0', border: '#6ee7b7', dot: '#10b981', text: '#065f46', code: '#047857' },
  { key: '3', label: 'Sky',   bg: '#bae6fd', border: '#7dd3fc', dot: '#0ea5e9', text: '#0c4a6e', code: '#0369a1' },
  { key: '4', label: 'Peach', bg: '#fed7aa', border: '#fdba74', dot: '#f97316', text: '#7c2d12', code: '#9a3412' },
] as const

export type SectionHeaderColorKey = (typeof SECTION_HEADER_PALETTE)[number]['key']

// Kept for backward compat — now alias to palette's default (key 'default')
export const DEFAULT_HEADER = SECTION_HEADER_PALETTE[0]

export function headerStyleFor(key: string | null | undefined) {
  if (!key) return SECTION_HEADER_PALETTE[0]
  return SECTION_HEADER_PALETTE.find((p) => p.key === key) ?? SECTION_HEADER_PALETTE[0]
}
