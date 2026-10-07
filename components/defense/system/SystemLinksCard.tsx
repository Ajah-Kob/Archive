'use client'

import { useActionState, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ExternalLink, Link2, Pencil, Plus, Trash2 } from 'lucide-react'
import { timeAgo } from '@/lib/helper'
import {
  addSystemLink,
  removeSystemLink,
  updateSystemLink,
  type StudentSystemLink,
} from '@/lib/actions/system-links'

/**
 * System Links card — contains the list of links with inline edit/remove,
 * plus a dashed "Add link" container at the bottom.
 *
 * Styling matches DefenseDocumentCard: same frame, header, and ghost buttons.
 */
export function SystemLinksCard({
  scheduleId,
  verdict,
  defenseLabel,
  initialLinks,
  editable,
}: {
  scheduleId: number
  verdict: string
  defenseLabel: string
  initialLinks: StudentSystemLink[]
  /** When false, hides add/edit/remove (panelist read-only view). */
  editable: boolean
}) {
  const router = useRouter()

  const [links, setLinks] = useState<StudentSystemLink[]>(initialLinks)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)

  // Sync local state when the server re-fetches (router.refresh).
  useEffect(() => {
    setLinks(initialLinks)
  }, [initialLinks])

  type ActionState = { success: boolean; message: string; payload: unknown }

  async function onAdd(_prev: ActionState | null, formData: FormData) {
    const res = await addSystemLink(scheduleId, formData)
    if (!res.success) {
      toast.error(res.message)
      return { success: false, message: res.message, payload: null }
    }
    toast.success(res.message)
    setShowForm(false)
    // Optimistic update: add the new link to local state immediately.
    if (res.payload) {
      setLinks((prev) => [...prev, res.payload as StudentSystemLink])
    }
    router.refresh()
    return { success: true, message: res.message, payload: null }
  }

  async function onRemove(linkId: number) {
    const res = await removeSystemLink(linkId)
    if (res.success) {
      toast.success(res.message)
      setEditingId(null)
      router.refresh()
    } else {
      toast.error(res.message)
    }
  }

  async function onSaveEdit(_prev: ActionState | null, formData: FormData) {
    const linkId = Number(formData.get('linkId'))
    const res = await updateSystemLink(linkId, formData)
    if (!res.success) {
      toast.error(res.message)
      return { success: false, message: res.message, payload: null }
    }
    toast.success(res.message)
    setEditingId(null)
    router.refresh()
    return { success: true, message: res.message, payload: null }
  }

  const [addState, addAction, isPending] = useActionState(onAdd, null)
  const [editState, editAction, isEditPending] = useActionState(
    onSaveEdit,
    null,
  )

  return (
    <div className="bg-white border border-[#e8ebf8] rounded-[14px] shadow-[0px_2px_12px_0px_rgba(30,58,138,0.06),0px_1px_3px_0px_rgba(0,0,0,0.04)] overflow-hidden">
      {/* Header */}
      <div className="border-[#f0f2fa] border-b w-full shrink-0">
        <div className="flex items-center justify-between h-fit w-full">
          <div className="flex items-center gap-2">
            <h4 className="p-4 font-sans text-[13.5px] font-bold text-[#2c3159] flex items-center gap-2">
              System Links
              <span className="rounded-full bg-[#eef2ff] px-2 py-0.5 text-[11px] font-bold text-[#707dff]">
                {links.length}
              </span>
            </h4>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-[14px] flex flex-col gap-[14px]">
        {showForm && editable ? (
          <form
            action={addAction}
            className="flex flex-col gap-3 rounded-[12px] border border-[#eef0f8] bg-[#fafaff] p-4"
          >
            <LinkFormFields
              isPending={isPending}
              error={addState && !addState.success ? addState.message : null}
              onCancel={() => setShowForm(false)}
            />
          </form>
        ) : null}

        {links.length === 0 ? (
          <p className="font-sans font-medium text-[13px] leading-[21.45px] text-[#8a93b4]">
            No links submitted yet for your {defenseLabel}.
          </p>
        ) : (
          links.map((link) => (
            <div
              key={link.id}
              className="rounded-[10px] bg-[#fafbff] border border-[#eceef8] p-3.5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h4 className="font-sora font-bold text-[13px] leading-[normal] text-[#1e3a8a] truncate">
                    {link.label}
                  </h4>
                  {link.note ? (
                    <p className="pt-[4px] font-sans font-medium text-[12px] leading-[18px] text-[#6b7399]">
                      {link.note}
                    </p>
                  ) : null}
                  <p className="pt-[4px] font-sans font-medium text-[11.5px] leading-[18px] text-[#9ea8c6]">
                    added by {link.createdBy.name} · updated{' '}
                    {timeAgo(link.updatedAt)}
                  </p>
                </div>

                <div className="flex items-start gap-[10px] shrink-0">
                  {editable ? (
                    <>
                      <button
                        type="button"
                        onClick={() => onRemove(link.id)}
                        aria-label={`Remove ${link.label}`}
                        className="flex items-center gap-[5px] h-fit px-[13px] py-[6px] font-sans font-bold text-[12px] leading-[18px] text-[#d34d5c] hover:opacity-80 transition-opacity shrink-0"
                      >
                        <Trash2 className="size-3" />
                        Remove
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(link.id)}
                        aria-label={`Edit ${link.label}`}
                        className="flex items-center gap-[5px] h-fit px-[13px] py-[6px] rounded-[8px] bg-[#f0f2fa] border border-[#e0e3f0] font-sans font-bold text-[12px] leading-[18px] text-[#5a6382] hover:bg-gray-50 transition-colors shrink-0"
                      >
                        <Pencil className="size-3" />
                        Edit
                      </button>
                    </>
                  ) : null}
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-[5px] h-[32px] px-[13px] py-[6px] rounded-[8px] bg-[#f0f2fa] border border-[#e0e3f0] font-sans font-bold text-[12px] leading-[18px] text-[#5a6382] hover:bg-gray-50 transition-colors shrink-0"
                  >
                    <ExternalLink className="size-3" />
                    Open
                  </a>
                </div>
              </div>

              {editingId === link.id ? (
                <form
                  action={editAction}
                  className="mt-3 rounded-[12px] border border-[#eef0f8] bg-[#fafaff] p-4"
                >
                  <input type="hidden" name="linkId" value={link.id} />
                  <LinkFormFields
                    isPending={isEditPending}
                    error={
                      editState && !editState.success ? editState.message : null
                    }
                    defaultLabel={link.label}
                    defaultUrl={link.url}
                    defaultNote={link.note ?? ''}
                    submitLabel="Save changes"
                    onCancel={() => setEditingId(null)}
                  />
                </form>
              ) : null}
            </div>
          ))
        )}

        {/* Dashed add link container — same pattern as add comment */}
        {editable && !showForm ? (
          <div className="rounded-[8px] border-2 border-dashed border-[#dfe3fb] py-1.5 px-3.5 bg-[#f7f8ff]">
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="flex w-full items-center justify-center gap-1.5 h-fit font-sans text-[13px] font-bold text-[#707dff] hover:text-[#5062f5] transition-colors"
            >
              <Link2 className="size-4" />
              Add link
            </button>
          </div>
        ) : null}
      </div>
    </div>
  )
}

/**
 * Shared field set for add and edit. Extracted because the two forms must not
 * drift -- a preset that exists in one and not the other would be a quiet bug.
 */
export function LinkFormFields({
  isPending,
  error,
  defaultLabel,
  defaultUrl,
  defaultNote,
  submitLabel = 'Save link',
  onCancel,
}: {
  isPending?: boolean
  error?: string | null
  defaultLabel?: string
  defaultUrl?: string
  defaultNote?: string
  submitLabel?: string
  onCancel?: () => void
}) {
  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="flex-1 min-w-0 flex flex-col gap-1">
          <span className="font-sans text-[11.5px] font-bold text-[#5a6382]">
            Name
          </span>
          <input
            name="label"
            type="text"
            required
            defaultValue={defaultLabel}
            placeholder="GitHub repository"
            maxLength={80}
            className="h-[34px] w-full rounded-[9px] border border-[#dfe3fb] bg-white px-2.5 font-sans text-[13px] text-[#2c3159] outline-none focus:border-[#707dff]"
          />
        </label>

        <label className="flex-[2] min-w-0 flex flex-col gap-1">
          <span className="font-sans text-[11.5px] font-bold text-[#5a6382]">
            Link
          </span>
          <input
            name="url"
            type="url"
            required
            defaultValue={defaultUrl}
            placeholder="https://github.com/your-group/project"
            maxLength={2048}
            className="h-[34px] w-full rounded-[9px] border border-[#dfe3fb] bg-white px-2.5 font-sans text-[13px] text-[#2c3159] outline-none focus:border-[#707dff]"
          />
        </label>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="submit"
            disabled={isPending}
            className="flex h-[34px] items-center gap-1.5 rounded-[9px] bg-[#707dff] px-4 font-sans text-[13px] font-bold text-white transition-colors hover:bg-[#5062f5] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? 'Saving…' : submitLabel}
          </button>
          {onCancel ? (
            <button
              type="button"
              onClick={onCancel}
              className="h-[34px] rounded-[9px] px-3 font-sans text-[13px] font-semibold text-[#6b7399] transition-colors hover:text-[#707dff]"
            >
              Cancel
            </button>
          ) : null}
        </div>
      </div>

      {defaultNote ? (
        <input type="hidden" name="note" value={defaultNote} />
      ) : null}

      {error ? (
        <p className="font-sans text-[12px] text-[#d34d5c]">{error}</p>
      ) : null}
    </>
  )
}
