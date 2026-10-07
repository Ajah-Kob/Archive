'use client'

import { useActionState, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Lock, Plus } from 'lucide-react'
import { linksAreEditable } from '@/lib/system-links'
import {
  addSystemLink,
  removeSystemLink,
  updateSystemLink,
  type StudentSystemLink,
} from '@/lib/actions/system-links'
import type { PanelistSystemComment } from '@/components/defense/system/SystemCommentsCard'
import { SystemLinkCard } from '@/components/defense/system/SystemLinkCard'
import { SystemCommentsCard } from '@/components/defense/system/SystemCommentsCard'

export function StudentSystemCard({
  scheduleId,
  verdict,
  defenseLabel,
  initialLinks,
  initialCommentsByLink,
}: {
  scheduleId: number
  verdict: string
  defenseLabel: string
  initialLinks: StudentSystemLink[]
  initialCommentsByLink: Record<number, PanelistSystemComment[]>
}) {
  const router = useRouter()
  const editable = linksAreEditable(verdict)

  const [links, setLinks] = useState<StudentSystemLink[]>(initialLinks)
  const [comments, setComments] =
    useState<Record<number, PanelistSystemComment[]>>(initialCommentsByLink)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)

  type ActionState = { success: boolean; message: string; payload: unknown }

  async function onAdd(_prev: ActionState | null, formData: FormData) {
    const res = await addSystemLink(scheduleId, formData)
    if (!res.success) {
      toast.error(res.message)
      return { success: false, message: res.message, payload: null }
    }
    toast.success(res.message)
    setShowForm(false)
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
  const [editState, editAction, isEditPending] = useActionState(onSaveEdit, null)
  const isEmpty = links.length === 0

  return (
    <section className="rounded-[14px] border border-[#eceef8] bg-white p-5 shadow-[0_4px_24px_rgba(112,125,255,0.08),0_1px_4px_rgba(0,0,0,0.04)]">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-sans text-[15px] font-bold text-[#2c3159]">
            System
          </h2>
          <p className="mt-0.5 font-sans text-[12px] text-[#8a93b4]">
            Links the panel will open for your {defenseLabel} — GitHub, Figma, a
            hosted build. Shared by the whole group.
          </p>
        </div>

        {editable ? (
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-1.5 h-[32px] px-3 rounded-[9px] bg-[#707dff] font-sans text-[12.5px] font-bold text-white hover:bg-[#5062f5] transition-colors shrink-0"
          >
            <Plus className="size-3.5" />
            Add link
          </button>
        ) : (
          <span className="flex items-center gap-1.5 rounded-full bg-[#eef0f6] px-2.5 py-1 font-sans text-[11px] font-bold text-[#5a6382]">
            <Lock className="size-3" />
            Locked — verdict submitted
          </span>
        )}
      </header>

      {showForm && editable ? (
        <form
          action={addAction}
          className="mt-4 flex flex-col gap-3 rounded-[12px] border border-[#eef0f8] bg-[#fafaff] p-4"
        >
          <LinkFormFields
            isPending={isPending}
            error={addState && !addState.success ? addState.message : null}
          />
        </form>
      ) : null}

      <div className="mt-4 flex flex-col gap-5">
        {isEmpty ? (
          <p className="font-sans text-[12.5px] text-[#8a93b4]">
            No links yet. Add the ones your panel will open.
          </p>
        ) : (
          links.map((link) => (
            <div key={link.id} className="flex flex-col gap-3">
              <div className="relative">
                <SystemLinkCard link={link} />
                {editable ? (
                  <div className="absolute top-3 right-3 flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setEditingId(link.id)}
                      aria-label={`Edit ${link.label}`}
                      className="flex size-[30px] items-center justify-center rounded-[9px] bg-white border border-[rgba(112,125,255,0.19)] text-[#707dff] hover:bg-[#eeefff] transition-colors"
                    >
                      <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                        <path d="m15 5 4 4" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemove(link.id)}
                      aria-label={`Remove ${link.label}`}
                      className="flex size-[30px] items-center justify-center rounded-[9px] bg-white border border-[#f0dfe2] text-[#d34d5c] hover:bg-[#fdf2f4] transition-colors"
                    >
                      <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 6h18" />
                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                ) : null}
              </div>

              {editingId === link.id ? (
                <form
                  action={editAction}
                  className="rounded-[12px] border border-[#eef0f8] bg-[#fafaff] p-4"
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

              <SystemCommentsCard
                linkId={link.id}
                initialComments={comments[link.id] ?? []}
                isPanelist={false}
              />
            </div>
          ))
        )}
      </div>
    </section>
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
