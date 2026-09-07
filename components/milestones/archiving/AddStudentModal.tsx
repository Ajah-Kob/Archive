'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useSession } from 'next-auth/react'
import { X, Users, User, Check, Loader2 } from 'lucide-react'
import { getMyWorkspace } from '@/lib/actions/groups'
import { splitName } from '@/lib/archiving/author-helpers'
import type { AuthorEntry } from '@/lib/archiving/validation'

interface GroupMember {
  id: number
  userId: number
  name: string
  email: string
  image: string | null
  isLeader: boolean
}

interface AddStudentModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (author: AuthorEntry) => void
  existingAuthors: AuthorEntry[]
}

function getInitials(name: string): string {
  return (name ?? '')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'U'
}

function isAlreadyAdded(member: GroupMember, existing: AuthorEntry[]): boolean {
  const memberEmail = (member.email ?? '').trim().toLowerCase()
  return existing.some((a) => {
    if (a.userId != null && a.userId === member.userId) return true
    if (a.email && a.email.trim().toLowerCase() === memberEmail) return true
    const aName = `${(a.firstName ?? '').trim().toLowerCase()}|${(a.lastName ?? '').trim().toLowerCase()}`
    const mSplit = splitName(member.name ?? '')
    const mName = `${mSplit.firstName.trim().toLowerCase()}|${mSplit.lastName.trim().toLowerCase()}`
    if (aName && mName && aName === mName) return true
    return false
  })
}

export function AddStudentModal({
  isOpen,
  onClose,
  onSelect,
  existingAuthors,
}: AddStudentModalProps) {
  const { data: session } = useSession()
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [members, setMembers] = useState<GroupMember[]>([])
  const [error, setError] = useState<string | null>(null)
  const overlayRef = useRef<HTMLDivElement | null>(null)
  const dialogRef = useRef<HTMLDivElement | null>(null)
  const closeBtnRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => setMounted(true), [])

  // Fetch current group students only via getMyWorkspace filtered by groupId
  useEffect(() => {
    if (!isOpen) return
    const userId = session?.user?.id ? Number(session.user.id) : NaN
    if (!Number.isFinite(userId)) {
      setError('Not authenticated.')
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    getMyWorkspace(userId)
      .then((res) => {
        if (cancelled) return
        if (!res.success || !res.payload?.group) {
          setMembers([])
          if (res.message) setError(res.message)
          else setError('No group found.')
          return
        }
        setMembers(res.payload.group.members ?? [])
      })
      .catch(() => {
        if (!cancelled) setError('Failed to load group members.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [isOpen, session?.user?.id])

  // Focus trap + Esc + focus first element on open
  useEffect(() => {
    if (!isOpen || !mounted) return

    const previouslyFocused = document.activeElement as HTMLElement | null
    // Focus close button after a tick
    const t = setTimeout(() => closeBtnRef.current?.focus(), 0)

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
        return
      }
      if (e.key !== 'Tab') return
      const dialog = dialogRef.current
      if (!dialog) return
      const focusable = dialog.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      )
      if (focusable.length === 0) return
      const first = focusable[0] as HTMLElement
      const last = focusable[focusable.length - 1] as HTMLElement
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault()
          last.focus()
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    // Prevent body scroll
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      clearTimeout(t)
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = prevOverflow
      previouslyFocused?.focus()
    }
  }, [isOpen, mounted, onClose])

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === overlayRef.current) onClose()
    },
    [onClose],
  )

  const handleSelect = useCallback(
    (member: GroupMember) => {
      const { firstName, lastName } = splitName(member.name ?? '')
      // Preserve linked vs custom distinction: userId set for member pick, null for custom entry
      // Survives group member removal because we keep snapshot {first,last,email,userId}
      const author: AuthorEntry = {
        userId: member.userId,
        firstName: firstName || member.name || '',
        lastName: lastName || '',
        email: member.email ?? '',
      }
      // If custom author already had this email/name, modal excludes it, so safe
      onSelect(author)
      onClose()
    },
    [onSelect, onClose],
  )

  const available = members.filter((m) => !isAlreadyAdded(m, existingAuthors))

  if (!mounted || !isOpen) return null

  const content = (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(16,19,58,0.3)] backdrop-blur-[4px] p-[16px]"
      role="presentation"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-student-title"
        aria-describedby="add-student-desc"
        className="relative bg-white border border-[#eceef8] rounded-[16px] w-full max-w-[480px] max-h-[min(640px,90vh)] shadow-[0px_24px_64px_0px_rgba(16,20,58,0.16),0px_4px_16px_0px_rgba(0,0,0,0.06)] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-[16px] px-[24px] pt-[22px] pb-[16px] border-b border-[#eceef8] shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-[8px]">
              <div className="size-[28px] rounded-[9px] bg-[rgba(112,125,255,0.08)] border border-[rgba(112,125,255,0.12)] flex items-center justify-center shrink-0">
                <Users className="size-[14px] text-[#707dff]" strokeWidth={2} />
              </div>
              <h2
                id="add-student-title"
                className="font-heading font-bold text-[15px] leading-[22px] text-[#12143a] tracking-[-0.15px]"
              >
                Pick from group
              </h2>
            </div>
            <p
              id="add-student-desc"
              className="font-sans text-[12px] leading-[16px] text-[#8a93b4] pt-[6px]"
            >
              Select a group member to add as author. Linked authors preserve userId.
            </p>
          </div>
          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="bg-[#fafbff] border border-[#eceef8] rounded-[12px] size-[28px] flex items-center justify-center hover:bg-gray-50 transition-colors shrink-0 focus:outline-none focus:ring-2 focus:ring-[rgba(112,125,255,0.2)]"
          >
            <X className="size-[13px] text-[#8a93b4]" strokeWidth={2} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-y-auto px-[16px] py-[12px] flex flex-col gap-[8px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-[32px] gap-[10px]">
              <Loader2 className="size-[18px] text-[#707dff] animate-spin" />
              <p className="font-sans text-[12.5px] text-[#8a93b4]">Loading group members…</p>
            </div>
          ) : error ? (
            <div className="rounded-[10px] border border-[#fecdd3] bg-[#fff1f2] px-[14px] py-[10px] flex items-center gap-[8px]">
              <User className="size-[14px] text-[#e11d48] shrink-0" />
              <p className="font-sans text-[12.5px] leading-[18px] text-[#be123c]">{error}</p>
            </div>
          ) : members.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-[28px] px-[16px] rounded-[12px] border border-dashed border-[#e8ebf8] bg-[#fafbff] gap-[8px]">
              <div className="size-[36px] rounded-full bg-white border border-[#eceef8] flex items-center justify-center">
                <Users className="size-[16px] text-[#9ea8c6]" />
              </div>
              <p className="font-sans font-medium text-[13px] leading-[18px] text-[#3a4170] text-center">
                No group members found
              </p>
              <p className="font-sans text-[12px] leading-[16px] text-[#8a93b4] text-center max-w-[300px]">
                You are not in a group or your group has no members yet.
              </p>
            </div>
          ) : available.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-[28px] px-[16px] rounded-[12px] border border-dashed border-[#e8ebf8] bg-[#fafbff] gap-[8px]">
              <div className="size-[36px] rounded-full bg-[#f4f6ff] border border-[#e5e8ff] flex items-center justify-center">
                <Check className="size-[16px] text-[#707dff]" strokeWidth={2.5} />
              </div>
              <p className="font-sans font-medium text-[13px] leading-[18px] text-[#3a4170] text-center">
                All group members already added
              </p>
              <p className="font-sans text-[12px] leading-[16px] text-[#8a93b4] text-center max-w-[300px]">
                Every member of your group is already in the authors list.
              </p>
            </div>
          ) : (
            <ul className="flex flex-col gap-[8px]" role="listbox" aria-label="Group members">
              {available.map((member) => (
                <li key={member.userId} role="option">
                  <button
                    type="button"
                    onClick={() => handleSelect(member)}
                    className="w-full flex items-center gap-[12px] rounded-[12px] border border-[#e8ebf8] bg-[#fafbff] hover:bg-white hover:border-[#d4d8f0] hover:shadow-[0px_1px_6px_rgba(112,125,255,0.08)] px-[12px] py-[10px] text-left transition-all focus:outline-none focus:ring-2 focus:ring-[rgba(112,125,255,0.18)] focus:border-[#707dff]"
                  >
                    {/* Avatar */}
                    <div className="shrink-0 size-[36px] rounded-full overflow-hidden bg-white border border-[#eceef8] flex items-center justify-center">
                      {member.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={member.image}
                          alt={member.name}
                          className="size-full object-cover"
                        />
                      ) : (
                        <span className="font-heading font-bold text-[11px] leading-none text-[#707dff]">
                          {getInitials(member.name)}
                        </span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0 flex flex-col gap-[1px]">
                      <span className="font-sans font-semibold text-[13px] leading-[18px] text-[#1e2145] truncate flex items-center gap-[6px]">
                        {member.name}
                        {member.isLeader && (
                          <span className="inline-flex items-center rounded-full bg-[#f4f6ff] border border-[#e5e8ff] px-[6px] py-[1px] font-sans font-semibold text-[10px] leading-[12px] tracking-[0.2px] text-[#707dff] uppercase">
                            Leader
                          </span>
                        )}
                      </span>
                      <span className="font-sans text-[12px] leading-[16px] text-[#8a93b4] truncate">
                        {member.email}
                      </span>
                    </div>

                    <span className="shrink-0 size-[28px] rounded-[9px] bg-white border border-[#e8ebf8] flex items-center justify-center text-[#707dff]">
                      <PlusIcon />
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-[10px] px-[16px] py-[12px] border-t border-[#eceef8] shrink-0 bg-[#fcfcff]">
          <p className="font-sans text-[11px] leading-[14px] text-[#9ea8c6]">
            {loading ? '' : available.length > 0 ? `${available.length} member${available.length === 1 ? '' : 's'} available` : ''}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="h-[36px] px-[16px] rounded-[10px] bg-white border border-[#e8ebf8] font-sans font-semibold text-[13px] leading-none text-[#5a6382] hover:bg-[#f8f9ff] transition-colors focus:outline-none focus:ring-2 focus:ring-[rgba(112,125,255,0.15)]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )

  return createPortal(content, document.body)
}

function PlusIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path d="M6 2.5V9.5M2.5 6H9.5" stroke="#707dff" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

export default AddStudentModal
