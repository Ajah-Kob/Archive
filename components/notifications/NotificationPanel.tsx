'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Bell, Check, Clock, X } from 'lucide-react'
import { toast } from 'sonner'
import { getInitials, timeAgo } from '@/lib/helper'
import {
  getMyPendingInvitations,
  acceptInvitation,
  declineInvitation,
  markAllInvitationsRead,
} from '@/lib/actions/invitation'

interface InvitationNotification {
  id: number
  role: string
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED'
  readAt: string | null
  createdAt: string
  faculty: {
    user: { id: number; name: string; email: string; image: string | null }
  }
  invitedBy: { id: number; name: string; image: string | null }
}

interface NotificationPanelProps {
  variant: 'collapsed' | 'expanded'
}

const ROLE_META: Record<string, { article: string; callout: string }> = {
  COORDINATOR: {
    article: 'a Coordinator',
    callout: 'Accepting will let you manage sections and student groups.',
  },
  ADVISER: {
    article: 'an Adviser',
    callout: 'Accepting will let you supervise student groups and review their capstone progress.',
  },
}

function roleLabel(role: string): string {
  return ROLE_META[role]?.article ?? `a ${role}`
}

function roleCallout(role: string): string {
  return (
    ROLE_META[role]?.callout ??
    'Accepting will unlock your workspace in the archive.'
  )
}

export default function NotificationPanel({ variant }: NotificationPanelProps) {
  const { data: session, update } = useSession()
  const userId = session?.user?.id ? +session.user.id : null

  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<InvitationNotification[]>([])
  const [loading, setLoading] = useState(false)
  const [busyId, setBusyId] = useState<number | null>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const timersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set())

  // Clear any pending remove-timers on unmount
  useEffect(() => {
    return () => {
      timersRef.current.forEach(clearTimeout)
    }
  }, [])

  const load = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    const result = await getMyPendingInvitations(userId)
    if (result.success) {
      setNotifications((result.payload ?? []) as InvitationNotification[])
    } else {
      toast.error(result.message)
    }
    setLoading(false)
  }, [userId])

  // Keep the badge fresh regardless of panel state (runs on mount; re-runs
  // when the session arrives and userId becomes available, via the `load` dep)
  useEffect(() => {
    load()
  }, [load])

  const handleToggle = () => {
    const next = !isOpen
    setIsOpen(next)
    if (next) load()
  }

  // Close on click outside or Escape
  useEffect(() => {
    if (!isOpen) return
    const handlePointerDown = (e: PointerEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  const unreadCount = notifications.filter((n) => !n.readAt).length

  // Flip an item to its transient state, then remove it from the panel.
  const transitionItem = (
    id: number,
    status: 'ACCEPTED' | 'REJECTED',
    readAt: string,
  ) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, status, readAt } : n)),
    )
    const timer = setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id))
      timersRef.current.delete(timer)
    }, 1500)
    timersRef.current.add(timer)
  }

  const handleAccept = async (id: number) => {
    setBusyId(id)
    const result = await acceptInvitation(id)
    if (result.success) {
      toast.success(result.message)
      transitionItem(
        id,
        'ACCEPTED',
        result.payload?.readAt
          ? new Date(result.payload.readAt).toISOString()
          : new Date().toISOString(),
      )
      await update()
    } else {
      toast.error(result.message)
    }
    setBusyId(null)
  }

  const handleDecline = async (id: number) => {
    setBusyId(id)
    const result = await declineInvitation(id)
    if (result.success) {
      toast.success(result.message)
      transitionItem(
        id,
        'REJECTED',
        result.payload?.readAt
          ? new Date(result.payload.readAt).toISOString()
          : new Date().toISOString(),
      )
    } else {
      toast.error(result.message)
    }
    setBusyId(null)
  }

  const handleMarkAllRead = async () => {
    if (!userId) return
    const result = await markAllInvitationsRead(userId)
    if (result.success) toast.success(result.message)
    else toast.error(result.message)
    load()
  }

  const avatarGradient = (i: number) =>
    `linear-gradient(135deg, ${
      ['#fe6f6f', '#f59e0b', '#22c55e', '#06b6d4', '#8b5cf6', '#707dff'][i % 6]
    }, ${
      ['#e85555', '#e08800', '#16a34a', '#0891b2', '#7c3aed', '#5565ff'][i % 6]
    })`

  const badge = unreadCount > 0 ? (
    <span className="bg-[#fe6f6f] text-white text-[10.5px] font-bold min-w-[20px] h-[20px] px-1.5 rounded-[10px] flex items-center justify-center">
      {unreadCount}
    </span>
  ) : null

  return (
    <div ref={wrapperRef} className="relative w-full">
      {variant === 'collapsed' ? (
        <button
          onClick={handleToggle}
          aria-label="Notifications"
          className="relative flex items-center justify-center w-full px-[19px] py-[11px] rounded-[9px] hover:bg-[rgba(112,125,255,0.05)] transition-colors"
        >
          <div className="relative">
            <Bell size={17} className="text-[#5a6382]" />
            {unreadCount > 0 && (
              <span className="absolute -top-[3px] -right-[3px] size-[8px] rounded-full bg-[#fe6f6f] border border-[#fafbff]" />
            )}
          </div>
        </button>
      ) : (
        <button
          onClick={handleToggle}
          className="flex gap-1 items-center w-full px-[19px] py-[11px] rounded-[9px] hover:bg-[rgba(112,125,255,0.05)] transition-colors text-left"
        >
          <div className="relative">
            <Bell size={17} className="text-[#5a6382]" />
            {unreadCount > 0 && (
              <span className="absolute -top-[3px] -right-[3px] size-[8px] rounded-full bg-[#fe6f6f] border border-[#fafbff]" />
            )}
          </div>
          <span className="flex-1 text-[13.5px] font-medium text-[#5a6382] min-w-px">
            Notifications
          </span>
          {badge}
        </button>
      )}

      {isOpen && (
        <div className="absolute bottom-full left-full ml-2 z-50 bg-white border border-[#eceef8] rounded-[14px] shadow-[0px_20px_60px_0px_rgba(16,20,58,0.18),0px_4px_16px_0px_rgba(0,0,0,0.06)] w-[378px] max-w-[calc(100vw-2rem)] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-[18px] pt-4 pb-[17px] border-b border-[#eceef8]">
            <div className="flex gap-2 items-center">
              <p className="font-['Sora',sans-serif] font-bold text-[14.5px] text-[#12143a] tracking-[-0.145px] whitespace-nowrap">
                Notifications
              </p>
              {badge}
            </div>
            <button
              onClick={() => setIsOpen(false)}
              aria-label="Close notifications"
              className="bg-[#fafbff] border border-[#eceef8] rounded-[14px] size-7 flex items-center justify-center hover:bg-gray-50 transition-colors shrink-0"
            >
              <X size={13} className="text-[#5a6382]" />
            </button>
          </div>

          {/* Items */}
          <div className="max-h-[min(560px,70vh)] overflow-y-auto">
            {loading && notifications.length === 0 ? (
              <div className="flex items-center justify-center h-24">
                <span className="text-[12.5px] font-medium text-[#9ea8c6]">
                  Loading notifications...
                </span>
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex items-center justify-center h-24">
                <span className="text-[12.5px] font-medium text-[#9ea8c6]">
                  No notifications yet.
                </span>
              </div>
            ) : (
              notifications.map((notification, i) => {
                const unread = !notification.readAt
                const senderName = notification.invitedBy?.name ?? 'Unknown'
                return (
                  <div
                    key={notification.id}
                    className={`relative px-[18px] pt-[14px] pb-[15px] border-b border-[#f4f5fc] ${
                      unread ? 'bg-[rgba(112,125,255,0.02)]' : ''
                    }`}
                  >
                    {unread && (
                      <span className="absolute top-4 right-4 size-[7px] rounded-[3.5px] bg-[#fe6f6f]" />
                    )}

                    <div className="flex gap-[11px] items-start">
                      <div
                        className="size-9 rounded-[18px] flex items-center justify-center shrink-0 shadow-[0px_2px_3px_rgba(0,0,0,0.12)]"
                        style={{ backgroundImage: avatarGradient(i) }}
                      >
                        <span className="text-white text-[12.96px] font-bold">
                          {getInitials(senderName)}
                        </span>
                      </div>

                      <div className="flex-1 min-w-px">
                        <p className="text-[13px] leading-[20.15px] text-[#3c4268] font-medium">
                          You&apos;ve been invited to become{' '}
                          <span className="font-bold text-[#12143a]">
                            {roleLabel(notification.role)}
                          </span>
                        </p>

                        <div className="flex items-center gap-[6px] pt-1">
                          <span className="bg-[#f4f5fc] rounded-[20px] px-2 py-[2px] text-[11px] font-semibold text-[#8a93b4] whitespace-nowrap">
                            by {senderName}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock size={10} className="text-[#c4cadf]" />
                            <span className="text-[11px] font-medium text-[#c4cadf] whitespace-nowrap">
                              {timeAgo(notification.createdAt)}
                            </span>
                          </span>
                        </div>

                        <div className="mt-3 bg-[rgba(245,158,11,0.03)] border border-[rgba(245,158,11,0.09)] rounded-[8px] px-[13px] py-[9px] text-[12px] font-medium text-[#8a93b4] leading-[18px]">
                          {roleCallout(notification.role)}
                        </div>

                        {notification.status === 'PENDING' ? (
                          <div className="flex gap-2 pt-3">
                            <button
                              onClick={() => handleDecline(notification.id)}
                              disabled={busyId !== null}
                              className="flex-1 border border-[#dddff0] rounded-[8px] py-[9px] text-[12.5px] font-semibold text-[#8a93b4] hover:bg-gray-50 disabled:opacity-60 transition-colors"
                            >
                              Decline
                            </button>
                            <button
                              onClick={() => handleAccept(notification.id)}
                              disabled={busyId !== null}
                              className="flex-[2] flex items-center justify-center gap-[6px] rounded-[8px] py-2 text-[12.5px] font-semibold text-white disabled:opacity-60 transition-colors shadow-[0px_3px_5px_rgba(34,197,94,0.28)]"
                              style={{
                                backgroundImage:
                                  'linear-gradient(170.57deg, #22c55e 0%, #16a34a 100%)',
                              }}
                            >
                              {busyId === notification.id ? (
                                <span className="size-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                              ) : (
                                <Check size={13} strokeWidth={3} />
                              )}
                              Accept Invitation
                            </button>
                          </div>
                        ) : (
                          <div className="flex pt-3">
                            <span
                              className={`rounded-[8px] px-[13px] py-[9px] text-[12.5px] font-semibold ${
                                notification.status === 'ACCEPTED'
                                  ? 'bg-[rgba(34,197,94,0.08)] text-[#16a34a]'
                                  : 'bg-[rgba(254,111,111,0.07)] text-[#e85555]'
                              }`}
                            >
                              {notification.status === 'ACCEPTED'
                                ? 'Invitation accepted'
                                : 'Invitation declined'}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Footer */}
          <button
            onClick={handleMarkAllRead}
            className="border-t border-[#eceef8] h-[45px] text-[12.5px] font-semibold text-[#707dff] hover:bg-[rgba(112,125,255,0.04)] transition-colors"
          >
            Mark all as read
          </button>
        </div>
      )}
    </div>
  )
}
