'use client'

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { Plus } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { HeaderBar } from '@/components/globals/HeaderBar'
import { SearchBar } from '@/components/ui/SearchBar'
import TemplateTable from '@/components/templates/main/TemplatesTable'
import UploadTemplateModal from '@/components/templates/modal/UploadTemplateModal'
import RemoveTemplateModal from '@/components/templates/modal/RemoveTemplateModal'
import { getTemplates } from '@/lib/actions/template'

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
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false)
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

  const handleViewFile = (file: TemplateItem) => {
    if (file.fileUrl && file.fileUrl !== '#') {
      window.open(file.fileUrl, '_blank')
    } else {
      alert(`Viewing ${file.name}`)
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
              <button
                type="button"
                onClick={() => setIsUploadModalOpen(true)}
                className="flex items-center gap-1.5 h-[37.5px] px-[14px] bg-[#707dff] text-white rounded-lg font-sans font-semibold text-[13px] shadow-[0px_2px_5px_rgba(112,125,255,0.25)] hover:bg-[#5565ff] active:scale-[0.98] transition-all shrink-0"
              >
                <Plus className="size-4" strokeWidth={2} />
                <span className="whitespace-nowrap">Upload Template</span>
              </button>
            ) : undefined
          }
        >
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="w-[280px] shrink-0 py-[8px]">
              <SearchBar
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder="Search templates..."
                ariaLabel="Search templates"
                clearable
              />
            </div>

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
          </div>
        </HeaderBar>

        <div className="flex-1 min-h-0 pt-[16px] px-8 pb-[30px] flex flex-col">
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

      {/* Upload Modal */}
      {isUploadModalOpen && canUpload && (
        <UploadTemplateModal
          isOpen={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)}
          onUploadComplete={handleUploadComplete}
        />
      )}

      {/* Confirm Remove Modal */}
      <RemoveTemplateModal
        template={removeTarget}
        onClose={() => {
          setRemoveTarget(null)
          fetchTemplates(searchTerm)
        }}
      />
    </>
  )
}
