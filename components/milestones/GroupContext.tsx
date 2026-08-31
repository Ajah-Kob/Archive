'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ArrowLeft, History } from 'lucide-react'

interface GroupContextProps {
  /**
   * When provided, renders a "Document History" button on the right side of
   * the context bar. Used on defense milestone pages to open the document
   * history drawer.
   */
  onDocumentHistory?: () => void
}

/**
 * Context bar for the student milestone pages.
 *
 * Renders a `< Back` button aligned to the left, linking back to the
 * milestone list. The button is hidden on the milestone list page itself
 * (`/student/milestone`) since there is no parent to return to.
 *
 * When `onDocumentHistory` is provided (defense pages), a "Document History"
 * button is rendered on the right side.
 */
export function GroupContext({ onDocumentHistory }: GroupContextProps) {
  const pathname = usePathname() || ''
  const isListPage = pathname === '/student/milestone'

  if (isListPage) return null

  return (
    <div className="flex items-center justify-between py-[14px] px-8 bg-[#eef2ff] border-b border-[#dfe3fb] shrink-0">
      <Link
        href="/student/milestone"
        className="flex items-center gap-[7px] h-[30px] px-[11px] bg-[#f7f7ff] border border-[rgba(112,125,255,0.19)] rounded-[9px] font-sans font-bold text-[12.5px] text-[#707dff] hover:bg-[#eeefff] transition-colors shrink-0"
      >
        <ArrowLeft className="size-3.5" />
        Back to Milestones
      </Link>

      {onDocumentHistory && (
        <button
          type="button"
          onClick={onDocumentHistory}
          className="flex items-center gap-[7px] h-[30px] px-[11px] bg-[#f7f7ff] border border-[rgba(112,125,255,0.19)] rounded-[9px] font-sans font-bold text-[12.5px] text-[#707dff] hover:bg-[#eeefff] transition-colors shrink-0"
        >
          <History className="size-3.5" />
          Document History
        </button>
      )}
    </div>
  )
}
