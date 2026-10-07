'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { MessageSquare, Trash2, AlertTriangle } from 'lucide-react'
import { getInitials, timeAgo } from '@/lib/helper'
import { deleteSystemComment } from '@/lib/actions/system-links'
import { SystemCommentComposer } from './SystemCommentComposer'

export interface SystemCommentItem {
  id: number
  body: string
  createdAt: Date | string
  author: { name: string }
  authorId: number
}

export type PanelistSystemComment = SystemCommentItem

export function SystemCommentsCard({
  linkId,
  initialComments,
  currentUserId,
  isPanelist = false,
}: {
  linkId: number
  initialComments: SystemCommentItem[]
  currentUserId?: number
  isPanelist?: boolean
}) {
  const router = useRouter()
  const [comments, setComments] = useState<SystemCommentItem[]>(initialComments)
  const [showComposer, setShowComposer] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  async function confirmDelete() {
    if (deletingId === null) return
    setIsDeleting(true)
    const targetId = deletingId
    // Optimistic remove
    setComments((prev) => prev.filter((c) => c.id !== targetId))
    setDeletingId(null)

    const res = await deleteSystemComment(targetId)
    setIsDeleting(false)
    if (res.success) {
      toast.success(res.message)
      router.refresh()
    } else {
      toast.error(res.message)
      // Revert if failed
      setComments(initialComments)
    }
  }

  return (
    <div className="rounded-[14px] border border-[#e4e7fb] bg-white shadow-[0_2px_12px_rgba(112,125,255,0.04)]">
      <div className="flex items-center justify-between border-b border-[#eef0f8]">
        <h4 className="p-4 font-sans text-[13.5px] font-bold text-[#2c3159] flex items-center gap-2">
          Panelist Comments
          <span className="rounded-full bg-[#eef2ff] px-2 py-0.5 text-[11px] font-bold text-[#707dff]">
            {comments.length}
          </span>
        </h4>
      </div>

      <div className="p-4 flex flex-col gap-2.5">
        {comments.length === 0 ? (
          <p className="font-sans text-[12.5px] text-[#8a93b4]">
            No comments yet.
          </p>
        ) : (
          comments.map((c) => (
          <div
            key={c.id}
            className="rounded-[10px] bg-[#f7f8ff] border border-[#eef0f8] p-3"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex size-5 items-center justify-center rounded-full bg-[#707dff] font-sans text-[9.5px] font-bold text-white shrink-0">
                {getInitials(c.author.name)}
              </span>
              <span className="font-sans text-[12px] font-bold text-[#2c3159]">
                {c.author.name}
              </span>
              <span className="font-sans text-[11px] text-[#8a93b4]">
                {timeAgo(c.createdAt)}
              </span>

              {currentUserId && c.authorId === currentUserId ? (
                <button
                  type="button"
                  onClick={() => setDeletingId(c.id)}
                  aria-label="Delete comment"
                  className="ml-auto flex items-center gap-1 font-sans text-[11.5px] font-semibold text-[#d34d5c] hover:text-[#b03a48] transition-colors shrink-0"
                >
                  <Trash2 className="size-3" />
                  Delete
                </button>
              ) : null}
            </div>
            <p className="mt-1.5 whitespace-pre-wrap font-sans text-[12.5px] leading-relaxed text-[#3d4468]">
              {c.body}
            </p>
          </div>
          ))
        )}

        {isPanelist ? (
          <div className="rounded-[8px] border-2 border-dashed border-[#dfe3fb] py-1.5 px-3.5 bg-[#f7f8ff]">
            {showComposer ? (
              <SystemCommentComposer
                linkId={linkId}
                placeholder="Leave a comment about this system…"
                autoFocus
                onDone={(newComment) => {
                  setShowComposer(false)
                  if (newComment) {
                    setComments((prev) => [
                      ...prev,
                      newComment as SystemCommentItem,
                    ])
                  }
                }}
              />
            ) : (
              <button
                type="button"
                onClick={() => setShowComposer(true)}
                className="flex w-full items-center justify-center gap-1.5 h-fit font-sans text-[13px] font-bold text-[#707dff] hover:text-[#5062f5] transition-colors"
              >
                <MessageSquare className="size-4" />
                Add comment
              </button>
            )}
          </div>
        ) : null}
      </div>

      {/* Confirmation Modal */}
      {deletingId !== null ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
          <div className="w-full max-w-md rounded-[16px] bg-white p-6 shadow-2xl border border-[#dfe3fb]">
            <div className="flex items-center gap-3 text-[#d34d5c]">
              <div className="flex size-10 items-center justify-center rounded-full bg-[#fdf2f4]">
                <AlertTriangle className="size-5" />
              </div>
              <h3 className="font-sans text-[16px] font-bold text-[#2c3159]">
                Delete Comment?
              </h3>
            </div>
            <p className="mt-3 font-sans text-[13.5px] text-[#5a6382]">
              Are you sure you want to delete this comment? This action cannot
              be undone.
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeletingId(null)}
                className="h-[36px] px-4 rounded-[10px] font-sans text-[13px] font-semibold text-[#6b7399] hover:text-[#2c3159] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={confirmDelete}
                className="h-[36px] px-4 rounded-[10px] bg-[#d34d5c] font-sans text-[13px] font-bold text-white hover:bg-[#b03a48] transition-colors disabled:opacity-60"
              >
                {isDeleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
