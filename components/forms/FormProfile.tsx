'use client'

import { useEffect, useRef, useState, useActionState } from 'react'
import Image from 'next/image'
import { Camera, Loader2, Pencil, Trash2, Undo2, X } from 'lucide-react'
import { toast } from 'sonner'
import { useSession } from 'next-auth/react'
import { usePathname, useRouter } from 'next/navigation'
import { updateMe } from '@/lib/actions/me'
import { deleteMedia, uploadMedia } from '@/lib/actions/media'
import { getInitials } from '@/lib/helper'
import { AuthInput } from '@/components/ui/AuthInput'
import { UnsavedChangesModal } from '@/components/forms/UnsavedChangesModal'
import { ProfileCropModal } from '@/components/forms/ProfileCropModal'

interface PendingChange {
  label: string
  from: string
  to: string
}

const DEFAULT_GRADIENT =
  'linear-gradient(135deg, #707dff 0%, #5062f5 60%, #3a52ef 100%)'

function formatRole(role?: string | null) {
  if (!role) return null
  const lower = role.toLowerCase().replace(/_/g, ' ')
  return lower.charAt(0).toUpperCase() + lower.slice(1)
}

export default function FormProfile({
  m,
  className,
}: {
  m: User
  className?: string
}) {
  const { data: session, update } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const formRef = useRef<HTMLFormElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const stagedImageRef = useRef<HTMLInputElement>(null)
  const stagedRemoveRef = useRef<HTMLInputElement>(null)
  const confirmedRef = useRef(false)
  const pendingNavRef = useRef<string | null>(null)
  const dirtyRef = useRef(false)
  const loadingRef = useRef(false)
  const profileRef = useRef<User>(m)

  // profile = last saved snapshot. Photo picks and removals are staged
  // (previewImage / pendingFile / pendingRemove) and only hit the database
  // when the user confirms Save.
  const [profile, setProfile] = useState<User>(m)
  const [previewImage, setPreviewImage] = useState<string | null>(
    m.image ?? null,
  )
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [pendingRemove, setPendingRemove] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [draftName, setDraftName] = useState('')
  const [draftEmail, setDraftEmail] = useState('')
  const [unsavedOpen, setUnsavedOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [state, handleSubmit, isPending] = useActionState(updateMe, {
    success: false,
    message: null,
    errors: null,
  })
  const loading = busy || isPending
  profileRef.current = profile

  // Switching pages always drops back to view-only mode.
  useEffect(() => {
    setCropModal((prev) => {
      if (prev) URL.revokeObjectURL(prev.url)
      return null
    })
    formRef.current?.reset()
    setPendingFile(null)
    setPendingRemove(false)
    setPreviewImage(profileRef.current.image ?? null)
    setUnsavedOpen(false)
    pendingNavRef.current = null
    dirtyRef.current = false
    setIsEditing(false)
  }, [pathname])

  useEffect(() => {
    if (state.success) {
      if (state.payload) {
        setProfile(state.payload)
        setPreviewImage(state.payload.image ?? null)
        sessionUpdate(state.payload)
      }
      formRef.current?.reset()
      setPendingFile(null)
      setPendingRemove(false)
      setIsEditing(false)
      dirtyRef.current = false
      if (state.message) toast.success(state.message)
      if (pendingNavRef.current) {
        const url = pendingNavRef.current
        pendingNavRef.current = null
        router.push(url)
      }
    } else {
      pendingNavRef.current = null
      // Field errors render as a toast since inputs show no inline state.
      const fieldErrors =
        state.errors && typeof state.errors === 'object'
          ? Object.values(state.errors as Record<string, string>).filter(Boolean)
          : []
      const message = state.message ?? fieldErrors.join(' ')
      if (message) toast.error(message)
    }
  }, [state])

  // Mirror dirtiness for the tab-close warning (registered once).
  useEffect(() => {
    dirtyRef.current = computeDirty()
  })

  // Warn on tab close / refresh with unsaved edits.
  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (dirtyRef.current) e.preventDefault()
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [])

  // Intercept in-app navigation while edits are unsaved. A save already in
  // flight is left alone so it can't double-submit.
  useEffect(() => {
    if (!isEditing) return
    function handleClickCapture(e: MouseEvent) {
      if (loadingRef.current) return
      const anchor = (e.target as HTMLElement).closest?.('a[href]')
      if (!anchor) return
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const href = anchor.getAttribute('href')
      if (!href || href.startsWith('#')) return
      if (!computeDirty()) return
      e.preventDefault()
      e.stopPropagation()
      pendingNavRef.current = href
      setUnsavedOpen(true)
    }
    document.addEventListener('click', handleClickCapture, true)
    return () => document.removeEventListener('click', handleClickCapture, true)
  }, [isEditing, draftName, draftEmail, pendingFile, pendingRemove])

  async function sessionUpdate(updatedUser: User) {
    // Merge updated fields into the existing session user, then refresh the
    // JWT via next-auth so the UI (and proxy flags) stay in sync.
    const newUser = {
      ...session?.user,
      ...updatedUser,
    }
    await update(newUser)
  }

  function computeDirty(): boolean {
    if (pendingFile !== null || pendingRemove) return true
    return (
      draftName.trim() !== (profile.name ?? '') ||
      draftEmail.trim() !== (profile.email ?? '')
    )
  }

  function readChangedFields(): PendingChange[] {
    const name = draftName.trim()
    const email = draftEmail.trim()
    const changes: PendingChange[] = []
    if (name !== (profile.name ?? '')) {
      changes.push({ label: 'Name', from: profile.name ?? '—', to: name || '—' })
    }
    if (email !== (profile.email ?? '')) {
      changes.push({
        label: 'Email',
        from: profile.email ?? '—',
        to: email || '—',
      })
    }
    if (pendingFile) {
      changes.push({
        label: 'Photo',
        from: profile.image ? 'Current photo' : 'No photo',
        to: 'New photo selected',
      })
    } else if (pendingRemove) {
      changes.push({
        label: 'Photo',
        from: 'Current photo',
        to: 'Photo removed',
      })
    }
    return changes
  }

  function handleEnterEdit() {
    setDraftName(profile.name ?? '')
    setDraftEmail(profile.email ?? '')
    dirtyRef.current = false
    setIsEditing(true)
  }

  async function handleFormSubmit(e: React.FormEvent<HTMLFormElement>) {
    // Let the confirmed submission through to the server action.
    if (confirmedRef.current) {
      confirmedRef.current = false
      return
    }
    e.preventDefault()
    if (readChangedFields().length === 0) {
      toast('No changes to save.')
      return
    }
    await prepareAndSubmit()
  }

  // Runs staged photo work (upload / blob delete must precede updateMe),
  // stages the results into hidden inputs, then submits the form action.
  async function prepareAndSubmit() {
    setBusy(true)
    try {
      if (pendingFile) {
        const upload = await uploadMedia(pendingFile)
        if (!upload?.success) {
          toast.error(upload?.message ?? 'Photo upload failed.')
          return
        }
        if (stagedImageRef.current) {
          stagedImageRef.current.value = upload.payload.url
        }
      } else if (pendingRemove) {
        if (!profile.image) return
        const dfd = new FormData()
        dfd.set('image', profile.image)
        const deleted = await deleteMedia(formRef.current, dfd)
        if (!deleted.success) {
          toast.error(deleted.message ?? 'Failed to remove photo.')
          return
        }
        if (stagedRemoveRef.current) {
          stagedRemoveRef.current.value = 'true'
        }
      }
    } catch {
      toast.error('Failed to prepare photo change.')
      return
    } finally {
      setBusy(false)
    }
    confirmedRef.current = true
    formRef.current?.requestSubmit()
  }

  function handleCancelEdit() {
    formRef.current?.reset()
    setDraftName('')
    setDraftEmail('')
    setPendingFile(null)
    setPendingRemove(false)
    setPreviewImage(profile.image ?? null)
    pendingNavRef.current = null
    dirtyRef.current = false
    setIsEditing(false)
  }

  async function handleUnsavedSave() {
    setUnsavedOpen(false)
    await prepareAndSubmit()
  }

  function handleUnsavedDiscard() {
    const url = pendingNavRef.current
    pendingNavRef.current = null
    dirtyRef.current = false
    setUnsavedOpen(false)
    formRef.current?.reset()
    setDraftName('')
    setDraftEmail('')
    setPendingFile(null)
    setPendingRemove(false)
    setPreviewImage(profile.image ?? null)
    setIsEditing(false)
    if (url) router.push(url)
  }

  const [cropModal, setCropModal] = useState<{ file: File; url: string } | null>(null)

  function handleFileSelect(file: File | undefined) {
    if (!file || busy || isPending) return
    if (cropModal) URL.revokeObjectURL(cropModal.url)
    setCropModal({ file, url: URL.createObjectURL(file) })
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function handleCropSave(cropped: File) {
    if (cropModal) URL.revokeObjectURL(cropModal.url)
    setCropModal(null)
    // Stage only — nothing touches the database until Save.
    setPendingRemove(false)
    setPendingFile(cropped)
    const reader = new FileReader()
    reader.onloadend = () => {
      setPreviewImage(reader.result as string)
    }
    reader.readAsDataURL(cropped)
  }

  function handleCropClose() {
    if (cropModal) URL.revokeObjectURL(cropModal.url)
    setCropModal(null)
  }

  function handleDeletePhoto() {
    if (busy || isPending || !previewImage) return
    // Stage only — the blob is deleted and the row nulled on Save.
    setPendingFile(null)
    setPendingRemove(!!profile.image)
    setPreviewImage(null)
  }

  const roleLabel = formatRole(profile.role)
  const hasChanges =
    draftName.trim() !== (profile.name ?? '') ||
    draftEmail.trim() !== (profile.email ?? '') ||
    pendingFile !== null ||
    pendingRemove
  const saveDisabled =
    loading ||
    draftName.trim() === '' ||
    draftEmail.trim() === '' ||
    !hasChanges

  return (
    <>
      <form
        ref={formRef}
        action={handleSubmit}
        onSubmit={handleFormSubmit}
        noValidate
        className={`flex flex-col gap-6 rounded-[14px] border border-[#eceef8] bg-white p-6 shadow-[0_4px_24px_rgba(112,125,255,0.08),0_1px_4px_rgba(0,0,0,0.04)] md:p-8${className ? ` ${className}` : ''}`}
      >
        {/* Staged photo payload — consumed by updateMe on confirmed Save. */}
        <input
          ref={stagedImageRef}
          type="hidden"
          name="image"
          defaultValue=""
        />
        <input
          ref={stagedRemoveRef}
          type="hidden"
          name="removeProfile"
          defaultValue="false"
        />

        {/* Identity header */}
        <div className="flex items-center gap-4">
          <div className="flex shrink-0 flex-col items-center gap-2">
            <div className="relative">
              <div className="block size-24 overflow-hidden rounded-full bg-[#f4f6ff] drop-shadow-[0_2px_2px_rgba(0,0,0,0.14)]">
                {previewImage ? (
                  <Image
                    src={previewImage}
                    alt="Profile photo"
                    className="size-full object-cover"
                    width={200}
                    height={200}
                  />
                ) : (
                  <span
                    className="flex size-full items-center justify-center"
                    style={{
                      backgroundImage:
                        profile.avatarGradient ?? DEFAULT_GRADIENT,
                    }}
                  >
                    <span className="font-heading text-[22px] font-bold leading-none text-white">
                      {getInitials(profile.name ?? '')}
                    </span>
                  </span>
                )}
                {busy && (
                  <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/30">
                    <Loader2 className="size-5 animate-spin text-white" />
                  </span>
                )}
              </div>
              {isEditing && previewImage && !busy && (
                <button
                  type="button"
                  onClick={handleDeletePhoto}
                  title="Remove photo"
                  aria-label="Remove profile photo"
                  className="absolute -bottom-1 -right-1 flex size-8 items-center justify-center rounded-full border border-[#eceef8] bg-white text-[#ef4444] shadow-[0_2px_8px_rgba(0,0,0,0.12)] transition-colors hover:bg-red-50"
                >
                  <Trash2 className="size-4" />
                </button>
              )}
              <input
                ref={fileInputRef}
                id="profile-image-input"
                type="file"
                accept=".jpg,.jpeg,.png,.webp"
                className="hidden"
                name="_image"
                disabled={!isEditing || loading}
                onChange={(e) => handleFileSelect(e.target.files?.[0])}
              />
            </div>
            {isEditing && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
                className="inline-flex items-center gap-[6px] rounded-full bg-[#707dff] px-3 py-1 font-sans text-[12.5px] font-semibold leading-[18.75px] text-white transition-colors hover:bg-[#5a67ff] disabled:opacity-60"
              >
                <Camera className="size-3.5" />
                Edit
              </button>
            )}
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate font-heading text-[18px] font-bold leading-[27px] text-[#1e2145]">
                {profile.name}
              </p>
              {roleLabel && (
                <span className="inline-flex shrink-0 items-center rounded-full border border-[#e5e8ff] bg-[#f4f6ff] px-[8px] py-[2px] font-sans text-[10.5px] font-bold leading-[15.75px] text-[#707dff]">
                  {roleLabel}
                </span>
              )}
            </div>
            <p className="truncate font-sans text-[12.5px] font-medium leading-[18.75px] text-[#8a93b4]">
              {profile.email}
            </p>
          </div>
        </div>

        {isEditing ? (
          <>
            <div className="h-px w-full bg-[#f0f2fa]" />

            {/* Fields start pre-filled with the current details. */}
            <div className="flex w-full flex-col gap-4">
              <AuthInput
                label="Name"
                name="name"
                type="text"
                placeholder="Enter name"
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                // NOTE: only isPending — disabling on busy would exclude the
                // input from FormData when requestSubmit fires before React
                // flushes the re-enable, dropping name/email on photo saves.
                disabled={isPending}
                required
                endPadding="pr-[68px]"
              >
                {draftName.trim() !== (profile.name ?? '') ? (
                  <span className="flex h-full items-center pr-2.5">
                    <button
                      type="button"
                      onClick={() => setDraftName(profile.name ?? '')}
                      aria-label="Undo name change"
                      disabled={loading}
                      className="inline-flex items-center gap-1 font-sans text-[12px] font-semibold text-[#707dff] transition-colors hover:text-[#5a67ff] disabled:opacity-60"
                    >
                      <Undo2 className="size-3" />
                      Undo
                    </button>
                  </span>
                ) : (
                  draftName !== '' && (
                    <span className="flex h-full items-center pr-2.5">
                      <button
                        type="button"
                        onClick={() => setDraftName('')}
                        aria-label="Clear name"
                        disabled={loading}
                        className="inline-flex items-center gap-1 font-sans text-[12px] font-semibold text-[#ef4444] transition-colors hover:text-[#dc2626] disabled:opacity-60"
                      >
                        <X className="size-3" />
                        Clear
                      </button>
                    </span>
                  )
                )}
              </AuthInput>
              <AuthInput
                label="Email Address"
                name="email"
                type="email"
                placeholder="Enter email address"
                value={draftEmail}
                onChange={(e) => setDraftEmail(e.target.value)}
                disabled={isPending}
                required
                endPadding="pr-[68px]"
              >
                {draftEmail.trim() !== (profile.email ?? '') ? (
                  <span className="flex h-full items-center pr-2.5">
                    <button
                      type="button"
                      onClick={() => setDraftEmail(profile.email ?? '')}
                      aria-label="Undo email change"
                      disabled={loading}
                      className="inline-flex items-center gap-1 font-sans text-[12px] font-semibold text-[#707dff] transition-colors hover:text-[#5a67ff] disabled:opacity-60"
                    >
                      <Undo2 className="size-3" />
                      Undo
                    </button>
                  </span>
                ) : (
                  draftEmail !== '' && (
                    <span className="flex h-full items-center pr-2.5">
                      <button
                        type="button"
                        onClick={() => setDraftEmail('')}
                        aria-label="Clear email"
                        disabled={loading}
                        className="inline-flex items-center gap-1 font-sans text-[12px] font-semibold text-[#ef4444] transition-colors hover:text-[#dc2626] disabled:opacity-60"
                      >
                        <X className="size-3" />
                        Clear
                      </button>
                    </span>
                  )
                )}
              </AuthInput>
              <div className="flex justify-end gap-[10px]">
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  disabled={loading}
                  className="inline-flex h-[38px] flex-1 items-center justify-center rounded-[9px] border border-[#dddff0] bg-white px-[19px] font-sans text-[13px] font-semibold leading-[19.5px] text-[#5a6382] transition-colors hover:bg-[#f8f9fe] disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saveDisabled}
                  className="inline-flex h-[38px] flex-1 items-center justify-center gap-[7px] rounded-[9px] bg-[#707dff] px-[19px] font-sans text-[13px] font-bold leading-[19.5px] text-white shadow-[0_2px_8px_rgba(112,125,255,0.35)] transition-colors hover:bg-[#5a67ff] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading && <Loader2 className="size-4 animate-spin" />}
                  {loading ? 'Saving...' : 'Save changes'}
                </button>
              </div>
            </div>
          </>
        ) : (
          <button
            type="button"
            onClick={handleEnterEdit}
            disabled={loading}
            className="flex h-[40px] w-full items-center justify-center gap-[7px] rounded-[10px] bg-[#707dff] font-sans text-[13px] font-bold leading-none text-white shadow-[0_4px_12px_rgba(112,125,255,0.32)] transition-all hover:bg-[#5a67ff] active:scale-[0.98] disabled:opacity-60"
          >
            <Pencil className="size-4" />
            Edit profile
          </button>
        )}
      </form>

      <UnsavedChangesModal
        isOpen={unsavedOpen}
        onSave={handleUnsavedSave}
        onDiscard={handleUnsavedDiscard}
        onClose={() => {
          pendingNavRef.current = null
          setUnsavedOpen(false)
        }}
      />

      {cropModal && (
        <ProfileCropModal
          imageUrl={cropModal.url}
          fileName={cropModal.file.name}
          onSave={handleCropSave}
          onClose={handleCropClose}
        />
      )}
    </>
  )
}
