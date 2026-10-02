'use client'

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { FileUp, Plus, ChevronDown } from 'lucide-react'
import { FloatingActionButton } from '@/components/ui/FloatingActionButton'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import { HeaderBar } from '@/components/globals/HeaderBar'
import { SearchBar } from '@/components/ui/SearchBar'
import TemplateTable from '@/components/templates/main/TemplatesTable'
import RemoveTemplateModal from '@/components/templates/modal/RemoveTemplateModal'
import ConfirmTemplateUploadModal from '@/components/templates/modal/ConfirmTemplateUploadModal'
import { getTemplates, uploadTemplate } from '@/lib/actions/template'

/** The four orderings the mobile select offers, in the order it lists them. */
const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest', field: 'date', dir: 'desc' },
  { value: 'oldest', label: 'Oldest', field: 'date', dir: 'asc' },
  { value: 'az', label: 'A-Z', field: 'name', dir: 'asc' },
  { value: 'za', label: 'Z-A', field: 'name', dir: 'desc' },
] as const

export interface TemplateItem {
  id: number
  name: string
  dateUploaded: string
  rawCreatedAt: string
  uploadedBy: string
  uploadedByEmail: string
  size: string
  rawSize: number
  fileUrl: string
}

export default function TemplatesPage({
  canUpload = true,
  canRemove = true,
}: {
  canUpload?: boolean
  canRemove?: boolean
}) {
  const [templates, setTemplates] = useState<TemplateItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [removeTarget, setRemoveTarget] = useState<TemplateItem | null>(null)
  const [sortField, setSortField] = useState<'name' | 'date' | 'uploadedBy' | 'size'>('date')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [myUploads, setMyUploads] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { data: session } = useSession()

  const handleSort = (field: typeof sortField) => {
    setSortDir((prev) => (sortField === field ? (prev === 'asc' ? 'desc' : 'asc') : 'desc'))
    setSortField(field)
  }

  // Mobile sort options. These drive the same sortField/sortDir pair the desktop
  // column headers use, so there is one source of truth for the ordering rather
  // than a second list sorted independently.
  const sortValue =
    sortField === 'date'
      ? sortDir === 'desc'
        ? 'newest'
        : 'oldest'
      : sortField === 'name' && sortDir === 'asc'
        ? 'az'
        : sortField === 'name'
          ? 'za'
          : // uploadedBy / size are only reachable from the desktop headers, so
            // there is no mobile option for them. Report the default rather than
            // a label that contradicts what the list is actually doing.
            'newest'

  function handleSortSelect(next: string) {
    const option = SORT_OPTIONS.find((o) => o.value === next)
    if (!option) return
    setSortField(option.field)
    setSortDir(option.dir)
  }

  const sortedTemplates = useMemo(() => {
    const sorted = [...templates]
    sorted.sort((a, b) => {
      let cmp = 0
      switch (sortField) {
        case 'name': cmp = a.name.localeCompare(b.name); break
        case 'date': cmp = a.rawCreatedAt.localeCompare(b.rawCreatedAt); break
        case 'uploadedBy': cmp = a.uploadedBy.localeCompare(b.uploadedBy); break
        case 'size': cmp = a.rawSize - b.rawSize; break
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
    return sorted
  }, [templates, sortField, sortDir])

  const displayedTemplates = useMemo(() => {
    if (!myUploads) return sortedTemplates
    const email = session?.user?.email?.toLowerCase()
    if (!email) return sortedTemplates
    return sortedTemplates.filter((t) => t.uploadedByEmail?.toLowerCase() === email)
  }, [sortedTemplates, myUploads, session?.user?.email])

  const fetchTemplates = useCallback(async (search?: string) => {
    setLoading(true)
    try {
      const data = await getTemplates(search)
      setTemplates(data as unknown as TemplateItem[])
      setError(null)
    } catch (err) {
      setError('Failed to load templates.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (searchTerm === '') {
      fetchTemplates('')
      return
    }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      fetchTemplates(searchTerm)
    }, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [searchTerm, fetchTemplates])

  const handleUploadComplete = () => {
    // Clear any active search so the newly uploaded template is visible.
    setSearchTerm('')
    fetchTemplates('')
  }

  // Upload runs in two steps: the OS file picker chooses the file, then a
  // confirmation modal approves it. The input is reset after each pick so
  // re-selecting the same file still fires a change event.
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  const openFilePicker = () => fileInputRef.current?.click()

  const handleFilePicked = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (file) setPendingFile(file)
  }

  const cancelPendingFile = () => {
    if (isUploading) return
    setPendingFile(null)
  }

  const confirmUpload = async () => {
    if (!pendingFile) return
    setIsUploading(true)

    const formData = new FormData()
    formData.append('file', pendingFile)

    const result = await uploadTemplate(formData)
    setIsUploading(false)

    if (!result.success) {
      // Keep the modal open on failure so the user can retry or cancel
      // without going back to the file picker.
      toast.error(result.message)
      return
    }

    toast.success('Template uploaded successfully.')
    setPendingFile(null)
    handleUploadComplete()
  }

  const handleViewFile = (file: TemplateItem) => {
    if (file.fileUrl && file.fileUrl !== '#') {
      window.open(file.fileUrl, '_blank')
    } else {
      // Unreachable today: Template.blobUrl is non-nullable in the schema and
      // getTemplates maps it straight through, so fileUrl is always a real blob
      // URL. Kept as a guard against a template row without an attached file.
      // Was a native alert() with stub copy ("Viewing <name>"), which would
      // have read as a bug had it ever fired.
      toast.error(`No file is attached to "${file.name}".`)
    }
  }

  const handleDownloadFile = (file: TemplateItem) => {
    const a = document.createElement('a')
    a.href = file.fileUrl
    a.download = file.name
    a.click()
  }

  return (
    <>
      <div className="flex flex-col flex-1 min-h-0">
        <HeaderBar
          actions={
            canUpload ? (
              // Hidden below sm — the floating button carries the action there.
      <button
        type="button"
        onClick={openFilePicker}
        disabled={isUploading}
        className="hidden sm:flex items-center gap-1.5 h-[37.5px] px-[14px] bg-[#707dff] text-white rounded-lg font-sans font-semibold text-[13px] shadow-[0px_2px_5px_rgba(112,125,255,0.25)] hover:bg-[#5565ff] active:scale-[0.98] transition-all shrink-0 disabled:opacity-60 disabled:pointer-events-none"
      >
        <Plus className="size-4" strokeWidth={2} />
        <span className="whitespace-nowrap">
          {isUploading ? 'Uploading\u2026' : 'Upload Template'}
        </span>
              </button>
            ) : undefined
          }
        >
          {/* Single line: search and the My Uploads toggle scroll together inside
              HeaderBar's strip rather than the toggle wrapping below. */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-[280px] shrink-0 sm:py-[8px]">
              <SearchBar
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder="Search templates..."
                ariaLabel="Search templates"
                clearable
              />
            </div>

            {canUpload && (
              <button
                type="button"
                role="switch"
                aria-checked={myUploads}
                aria-label="Filter my uploads"
                onClick={() => setMyUploads(!myUploads)}
                className="flex items-center gap-2 h-[37.5px] px-[13px] bg-white border border-[#e8ebf8] rounded-lg hover:border-[rgba(112,125,255,0.6)] transition-colors shrink-0"
              >
                <span className="font-sans font-semibold text-[13px] text-[#5a6382] whitespace-nowrap">
                  My Uploads
                </span>
                <span
                  className={`relative w-[32px] h-[18px] rounded-full transition-colors ${
                    myUploads ? 'bg-[#707dff]' : 'bg-[#dddff0]'
                  }`}
                >
                  <span
                    className={`absolute top-[2.5px] left-[2.5px] size-[13px] bg-white rounded-full shadow-sm transition-transform ${
                      myUploads ? 'translate-x-[14px]' : ''
                    }`}
                  />
                </span>
              </button>
            )}
          </div>
        </HeaderBar>

        <div className="flex-1 min-h-0 pt-[16px] px-4 pb-[30px] sm:px-8 flex flex-col">
          {/* Mobile-only ordering. Hidden from sm up because the desktop grid
              already sorts through clickable NAME and DATE UPLOADED headers, and
              a second control there would just duplicate them. */}
          <div className="sm:hidden flex items-center justify-start gap-[10px] mb-[12px] shrink-0">
            <div className="relative">
              <select
                id="template-sort"
                aria-label="Sort templates"
                value={sortValue}
                onChange={(e) => handleSortSelect(e.target.value)}
                className="appearance-none h-[37.5px] pl-[13px] pr-[36px] bg-white border border-[#e8ebf8] rounded-lg font-sans font-semibold text-[13px] text-[#5a6382] cursor-pointer focus:outline-none focus:border-[rgba(112,125,255,0.6)] hover:border-[rgba(112,125,255,0.6)] transition-colors"
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <ChevronDown
                aria-hidden="true"
                className="pointer-events-none absolute right-[12px] top-1/2 -translate-y-1/2 size-4 text-[#8a93b4]"
              />
            </div>
          </div>

          <TemplateTable
            templates={displayedTemplates}
            error={loading ? null : error}
            loading={loading}
            isEmpty={!loading && templates.length === 0 && !searchTerm}
            sortField={sortField}
            sortDir={sortDir}
            onSort={handleSort}
            getRowActions={(item) => [
              { label: 'View', onClick: () => handleViewFile(item) },
              { label: 'Download', onClick: () => handleDownloadFile(item) },
              ...(canRemove
                ? [
                    {
                      label: 'Remove',
                      variant: 'danger' as const,
                      onClick: () => setRemoveTarget(item),
                    },
                  ]
                : []),
            ]}
          />
        </div>
      </div>

      {/* The OS file picker, driven by the bar button and the FAB. Kept in the
          DOM and visually hidden so both can open the same one. Reset after
          every pick so choosing the same file twice still fires onChange. */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.doc,.docx"
        onChange={handleFilePicked}
        className="hidden"
        aria-hidden="true"
        tabIndex={-1}
      />

      {/* Second step: confirm the file chosen above. */}
      <ConfirmTemplateUploadModal
        file={pendingFile}
        busy={isUploading}
        onConfirm={confirmUpload}
        onClose={cancelPendingFile}
      />

      {/* Confirm Remove Modal */}
      <RemoveTemplateModal
        template={removeTarget}
        onClose={() => {
          setRemoveTarget(null)
          fetchTemplates(searchTerm)
        }}
      />
        {/* Mobile stand-in for the Upload Template button in the bar. Same gate. */}
        {canUpload ? (
          <FloatingActionButton
            icon={<FileUp className="size-6" strokeWidth={2} />}
            label="Upload Template"
            onClick={openFilePicker}
            className={isUploading ? 'pointer-events-none opacity-60' : ''}
          />
        ) : null}
      </>
    )
}
