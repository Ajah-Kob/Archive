'use client'

import {
  useActionState,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ExternalLink, Link2, Lock, Pencil, Plus, Trash2 } from 'lucide-react'
import { getInitials, timeAgo } from '@/lib/helper'
import { linksAreEditable } from '@/lib/system-links'
import {
  addSystemLink,
  copyProposalLinks,
  getSystemLinkCommentsForStudent,
  getSystemLinksForStudent,
  removeSystemLink,
  updateSystemLink,
  type StudentSystemLink,
} from '@/lib/actions/system-links'
import type { PanelistSystemComment } from '@/components/defense/system/SystemLinkCard'

/**
 * The student's System card, shown inside the Defense tab they already have.
 *
 * Fetched client-side rather than threaded down as a prop: this panel already
 * reloads through DefenseTabsRefreshContext, and a self-fetching card keeps the
 * prop surface small and the card reusable across both defense types.
 *
 * The card does not render at all when there is no schedule -- that is the
 * parent panel's job, not a disabled card here.
 */
export function StudentSystemCard({
  scheduleId,
  verdict,
  defenseLabel,
}: {
  scheduleId: number
  verdict: string
  defenseLabel: string
}) {
  const router = useRouter()
  const editable = linksAreEditable(verdict)

  const [links, setLinks] = useState<StudentSystemLink[] | null>(null)
  const [comments, setComments] = useState<
    Record<number, PanelistSystemComment[]>
  >({})
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)

  async function load() {
    const res = await getSystemLinksForStudent(scheduleId)
    const rows = res.success ? (res.payload?.links ?? []) : []
    setLinks(rows)
    // Students read the panelist discussion, so fetch bodies for every link.
    const threads = await Promise.all(
      rows.map((l) => getSystemLinkCommentsForStudent(l.id)),
    )
    const map: Record<number, PanelistSystemComment[]> = {}
    rows.forEach((l, i) => {
      const t = threads[i]
      map[l.id] =
        t.success ? ((t.payload?.comments ?? []) as unknown as PanelistSystemComment[]) : []
    })
    setComments(map)
  }

  useEffect(() => {
    let cancelled = false
    void (async () => {
      await load()
      if (cancelled) return
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scheduleId])

  type ActionState = { success: boolean; message: string; payload: unknown }

  async function onAdd(_prev: ActionState | null, formData: FormData) {
    const res = await addSystemLink(scheduleId, formData)
    if (!res.success) {
      toast.error(res.message)
      return { success: false, message: res.message, payload: null }
    }
    toast.success(res.message)
    setShowForm(false)
    await load()
    router.refresh()
    return { success: true, message: res.message, payload: null }
  }

  async function onRemove(linkId: number) {
    const res = await removeSystemLink(linkId)
    if (res.success) {
      toast.success(res.message)
      setEditingId(null)
      await load()
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
    await load()
    router.refresh()
    return { success: true, message: res.message, payload: null }
  }

  const [addState, addAction, isPending] = useActionState(onAdd, null)
  const [editState, editAction, isEditPending] = useActionState(onSaveEdit, null)
  const isEmpty = links !== null && links.length === 0

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
          <LinkFormFields isPending={isPending} error={addState && !addState.success ? addState.message : null} />
        </form>
      ) : null}

      <div className="mt-4 flex flex-col gap-3">
        {links === null ? (
          <p className="font-sans text-[12.5px] text-[#8a93b4]">Loading links…</p>
        ) : isEmpty ? (
          <p className="font-sans text-[12.5px] text-[#8a93b4]">
            No links yet. Add the ones your panel will open.
          </p>
        ) : (
          links.map((link) => (
            <StudentLinkRow
              key={link.id}
              link={link}
              comments={comments[link.id] ?? []}
              editable={editable}
              busy={editingId === link.id}
              onEdit={() => setEditingId(link.id)}
              onCancelEdit={() => setEditingId(null)}
              onRemove={() => onRemove(link.id)}
            >
              {editingId === link.id ? (
                <form action={editAction}>
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
            </StudentLinkRow>
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
      {/* One row on desktop, stacked below sm. items-end keeps the button
          baseline-aligned with the inputs instead of hanging below them. */}
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

        {/* Buttons live in the same row so the row reads as one control. */}
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

      {/* Kept out of the form but still submitted so editing a link that had a
          note does not silently wipe it. */}
      {/* Kept out of the form but still submitted so editing a link that had a
          note does not silently wipe it. */}
      {defaultNote ? <input type="hidden" name="note" value={defaultNote} /> : null}

      {error ? (
        <p className="font-sans text-[12px] text-[#d34d5c]">{error}</p>
      ) : null}
    </>
  )
}

function StudentLinkRow({
  link,
  comments,
  editable,
  busy,
  onEdit,
  onCancelEdit,
  onRemove,
  children,
}: {
  link: StudentSystemLink
  comments: PanelistSystemComment[]
  editable: boolean
  busy: boolean
  onEdit: () => void
  onCancelEdit: () => void
  onRemove: () => void
  /** The inline edit form, rendered only while this row is the one being edited. */
  children?: React.ReactNode
}) {
  const [showComments, setShowComments] = useState(false)
  const isEditing = busy

  return (
    <article className="rounded-[12px] border border-[#eef0f8] bg-[#fafaff] p-3.5">
      {/* While editing, the form below already shows the name and the URL, so
          repeating them above is noise. */}
      {isEditing ? null : (
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate font-sans text-[13.5px] font-bold text-[#2c3159]">
              {link.label}
            </h3>
            {link.note ? (
              <p className="mt-0.5 font-sans text-[12px] text-[#5a6382]">
                {link.note}
              </p>
            ) : null}
            <p className="mt-0.5 font-sans text-[11px] text-[#8a93b4]">
              added by {link.createdBy.name} · updated {timeAgo(link.updatedAt)}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            {editable ? (
              <>
              <button
                type="button"
                onClick={onEdit}
                aria-label={`Edit ${link.label}`}
                className="flex size-[30px] items-center justify-center rounded-[9px] bg-white border border-[rgba(112,125,255,0.19)] text-[#707dff] hover:bg-[#eeefff] transition-colors"
              >
                <Pencil className="size-3.5" />
              </button>
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 h-[30px] px-2.5 rounded-[9px] bg-white border border-[rgba(112,125,255,0.19)] font-sans text-[12px] font-bold text-[#707dff] hover:bg-[#eeefff] transition-colors"
              >
                Open
                <ExternalLink className="size-3" />
              </a>
              <button
                type="button"
                onClick={onRemove}
                aria-label={`Remove ${link.label}`}
                className="flex size-[30px] items-center justify-center rounded-[9px] bg-white border border-[#f0dfe2] text-[#d34d5c] hover:bg-[#fdf2f4] transition-colors"
              >
                <Trash2 className="size-3.5" />
              </button>
              </>
            ) : null}
          </div>
        </div>
      )}

      {isEditing ? children : null}

      {comments.length > 0 ? (
        <div className="mt-2.5 border-t border-[#eef0f8] pt-2.5">
          <button
            type="button"
            onClick={() => setShowComments((v) => !v)}
            className="flex items-center gap-1.5 font-sans text-[12px] font-bold text-[#707dff] hover:text-[#5062f5] transition-colors"
          >
            <Link2 className="size-3" />
            {showComments
              ? 'Hide panelist comments'
              : `${comments.length} panelist comment${comments.length === 1 ? '' : 's'}`}
          </button>

          {showComments ? (
            <div className="mt-2 flex flex-col gap-2">
              {comments.map((c) => (
                <div
                  key={c.id}
                  className="rounded-[10px] bg-white border border-[#eef0f8] p-3"
                >
                  <div className="flex items-center gap-2">
                    <span className="flex size-5 items-center justify-center rounded-full bg-[#707dff] font-sans text-[9.5px] font-bold text-white">
                      {getInitials(c.author.name)}
                    </span>
                    <span className="font-sans text-[12px] font-bold text-[#2c3159]">
                      {c.author.name}
                    </span>
                    <span className="font-sans text-[11px] text-[#8a93b4]">
                      {timeAgo(c.createdAt)}
                    </span>
                  </div>
                  <p className="mt-1.5 whitespace-pre-wrap font-sans text-[12.5px] leading-relaxed text-[#3d4468]">
                    {c.body}
                  </p>
                </div>
              ))}
              <p className="font-sans text-[11.5px] text-[#8a93b4]">
                Comments are one-way — reply to your panel directly.
              </p>
            </div>
          ) : null}
        </div>
      ) : null}
    </article>
  )
}