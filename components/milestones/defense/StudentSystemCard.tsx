'use client'

import { useActionState, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Copy, ExternalLink, Link2, Lock, Plus, Trash2 } from 'lucide-react'
import { getInitials, timeAgo } from '@/lib/helper'
import { LINK_PRESETS, OTHER_PRESET, linksAreEditable } from '@/lib/system-links'
import {
  addSystemLink,
  copyProposalLinks,
  getSystemLinkCommentsForStudent,
  getSystemLinksForStudent,
  removeSystemLink,
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

  async function onCopy() {
    const res = await copyProposalLinks(scheduleId)
    if (res.success) {
      toast.success(res.message)
      await load()
      router.refresh()
    } else {
      toast.error(res.message)
    }
  }

  async function onRemove(linkId: number) {
    const res = await removeSystemLink(linkId)
    if (res.success) {
      toast.success(res.message)
      await load()
      router.refresh()
    } else {
      toast.error(res.message)
    }
  }

  const [addState, addAction, isPending] = useActionState(onAdd, null)
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
          <div className="flex items-center gap-2">
            {isEmpty ? (
              <button
                type="button"
                onClick={onCopy}
                className="flex items-center gap-1.5 h-[32px] px-3 rounded-[9px] border border-[rgba(112,125,255,0.19)] bg-[#f7f7ff] font-sans text-[12.5px] font-bold text-[#707dff] hover:bg-[#eeefff] transition-colors"
              >
                <Copy className="size-3.5" />
                Copy from other defense
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setShowForm((v) => !v)}
              className="flex items-center gap-1.5 h-[32px] px-3 rounded-[9px] bg-[#707dff] font-sans text-[12.5px] font-bold text-white hover:bg-[#5062f5] transition-colors"
            >
              <Plus className="size-3.5" />
              Add link
            </button>
          </div>
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
              onRemove={() => onRemove(link.id)}
            />
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
  submitLabel = 'Add link',
}: {
  isPending?: boolean
  error?: string | null
  defaultLabel?: string
  defaultUrl?: string
  defaultNote?: string
  submitLabel?: string
}) {
  const [preset, setPreset] = useState(defaultLabel ?? LINK_PRESETS[0])
  const isOther = preset === OTHER_PRESET

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="flex flex-1 flex-col gap-1">
          <span className="font-sans text-[11.5px] font-bold text-[#5a6382]">
            Kind
          </span>
          <select
            value={preset}
            onChange={(e) => setPreset(e.target.value)}
            className="h-[34px] rounded-[9px] border border-[#dfe3fb] bg-white px-2.5 font-sans text-[13px] text-[#2c3159] outline-none focus:border-[#707dff]"
          >
            {LINK_PRESETS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-[2] flex-col gap-1">
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
            className="h-[34px] rounded-[9px] border border-[#dfe3fb] bg-white px-2.5 font-sans text-[13px] text-[#2c3159] outline-none focus:border-[#707dff]"
          />
        </label>
      </div>

      {isOther ? (
        <label className="flex flex-col gap-1">
          <span className="font-sans text-[11.5px] font-bold text-[#5a6382]">
            Label
          </span>
          <input
            name="customLabel"
            defaultValue={defaultLabel && defaultLabel !== OTHER_PRESET ? defaultLabel : ''}
            placeholder="e.g. Staging deployment"
            maxLength={80}
            className="h-[34px] rounded-[9px] border border-[#dfe3fb] bg-white px-2.5 font-sans text-[13px] text-[#2c3159] outline-none focus:border-[#707dff]"
          />
        </label>
      ) : null}

      {/* The preset is submitted as `label`; normalizeLabel() prefers the custom
          text only when the preset is "Other". */}
      {isOther ? (
        <input type="hidden" name="label" value={OTHER_PRESET} />
      ) : (
        <input type="hidden" name="label" value={preset} />
      )}

      <label className="flex flex-col gap-1">
        <span className="font-sans text-[11.5px] font-bold text-[#5a6382]">
          Note <span className="font-normal text-[#8a93b4]">(optional)</span>
        </span>
        <input
          name="note"
          defaultValue={defaultNote ?? ''}
          placeholder="What does this link show?"
          maxLength={280}
          className="h-[34px] rounded-[9px] border border-[#dfe3fb] bg-white px-2.5 font-sans text-[13px] text-[#2c3159] outline-none focus:border-[#707dff]"
        />
      </label>

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
  onRemove,
}: {
  link: StudentSystemLink
  comments: PanelistSystemComment[]
  editable: boolean
  busy: boolean
  onEdit: () => void
  onRemove: () => void
}) {
  const [showComments, setShowComments] = useState(false)

  return (
    <article className="rounded-[12px] border border-[#eef0f8] bg-[#fafaff] p-3.5">
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
            {link.copiedFromId ? ' · copied' : ''}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <a
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 h-[30px] px-2.5 rounded-[9px] bg-white border border-[rgba(112,125,255,0.19)] font-sans text-[12px] font-bold text-[#707dff] hover:bg-[#eeefff] transition-colors"
          >
            Open
            <ExternalLink className="size-3" />
          </a>
          {editable ? (
            <button
              type="button"
              onClick={onRemove}
              disabled={busy}
              aria-label={`Remove ${link.label}`}
              className="flex size-[30px] items-center justify-center rounded-[9px] bg-white border border-[#f0dfe2] text-[#d34d5c] hover:bg-[#fdf2f4] transition-colors disabled:opacity-50"
            >
              <Trash2 className="size-3.5" />
            </button>
          ) : null}
        </div>
      </div>

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
                  {c.replies.length > 0 ? (
                    <div className="mt-2 flex flex-col gap-1.5 border-l-2 border-[#dfe3fb] pl-3">
                      {c.replies.map((r) => (
                        <p
                          key={r.id}
                          className="whitespace-pre-wrap font-sans text-[12px] leading-relaxed text-[#5a6382]"
                        >
                          <span className="font-bold text-[#2c3159]">
                            {r.author.name}:
                          </span>{' '}
                          {r.body}
                        </p>
                      ))}
                    </div>
                  ) : null}
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