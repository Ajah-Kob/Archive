'use client'

import { FileText } from 'lucide-react'

interface FileIconProps {
  filename: string
}

const EXTENSION_COLORS: Record<string, { bg: string; text: string }> = {
  pdf: { bg: 'bg-[rgba(254,111,111,0.07)]', text: 'text-[#fe6f6f]' },
  doc: { bg: 'bg-[rgba(112,125,255,0.07)]', text: 'text-[#707dff]' },
  docx: { bg: 'bg-[rgba(112,125,255,0.07)]', text: 'text-[#707dff]' },
  xls: { bg: 'bg-[rgba(16,185,129,0.07)]', text: 'text-emerald-500' },
  xlsx: { bg: 'bg-[rgba(16,185,129,0.07)]', text: 'text-emerald-500' },
  ppt: { bg: 'bg-[rgba(249,115,22,0.07)]', text: 'text-orange-500' },
  pptx: { bg: 'bg-[rgba(249,115,22,0.07)]', text: 'text-orange-500' },
}

export function FileIcon({ filename }: FileIconProps) {
  const ext = filename.split('.').pop()?.toLowerCase() ?? ''
  const colors = EXTENSION_COLORS[ext] ?? { bg: 'bg-slate-50', text: 'text-slate-500' }

  return (
    <div className={`size-[34px] rounded-[8px] flex items-center justify-center shrink-0 ${colors.bg} ${colors.text}`}>
      <FileText size={16} />
    </div>
  )
}
