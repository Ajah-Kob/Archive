'use client'

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { Upload } from 'lucide-react'
import { useSession } from 'next-auth/react'
import TemplatesToolbar from '@/components/templates/main/TemplatesToolbar'
import TemplateTable from '@/components/templates/main/TemplatesTable'
import UploadTemplateModal from '@/components/templates/modal/UploadTemplateModal'
import RemoveTemplateModal from '@/components/templates/modal/RemoveTemplateModal'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { getTemplates } from '@/lib/actions/template'

export type UserRole = 'student' | 'faculty'

export interface TemplateItem {
  id: number
  name: string
  dateUploaded: string
  rawCreatedAt: string
  uploadedBy: string
  size: string
  rawSize: number
  fileUrl: string
}

export default function TemplatesPage() {
  const { data: session } = useSession()
  const userRole = 'faculty'

  const [templates, setTemplates] = useState<TemplateItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false)
  const [removeTarget, setRemoveTarget] = useState<TemplateItem | null>(null)
  const [sortField, setSortField] = useState<'name' | 'date' | 'uploadedBy' | 'size'>('date')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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
    fetchTemplates(searchTerm)
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
      <div className="flex flex-col w-full gap-5 h-full">
        {/* Headings and Breadcrumbs */}
        <div className="flex flex-col gap-[12px]">
          {/* Breadcrumbs */}
          <Breadcrumbs
            items={[
              { label: 'ARCHIVE' },
              { label: 'Templates', isActive: true },
            ]}
          />

          <div className="flex">
            {/* Heading */}
            <div className="flex flex-col w-full gap-1">
              <h1 className="font-heading font-bold text-[26px] leading-[20.25px] text-[#10133a] tracking-[-0.135px]">
                Templates
              </h1>
              <p className="font-sans font-medium text-[13.5px] text-[#8a93b4]">
                View and manage coordinators responsible for handling capstone
                sections.
              </p>
            </div>

            {/* Upload Button - Only specific faculty role can access this button */}
            {userRole === 'faculty' && (
              <button
                type="button"
                onClick={() => setIsUploadModalOpen(true)}
                className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-br from-[#707dff] via-[#707dff] to-[#5555ff] bg-[length:200%_200%] bg-[position:0%_0%] hover:bg-[position:100%_100%] text-white rounded-xl text-sm font-semibold transition-all duration-500 shadow-sm hover:shadow-md hover:shadow-indigo-500/20 active:scale-95 shrink-0"
              >
                <Upload size={16} />
                <span>Upload Template</span>
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-[10px] flex-1 min-h-px">
          {/* Toolbar */}
          <TemplatesToolbar
            searchTerm={searchTerm}
            onSearchChange={(e) => setSearchTerm(e.target.value)}
            resultCount={templates.length}
          />

          {/* Data Table */}
          <TemplateTable
            templates={sortedTemplates}
            error={loading ? null : error}
            loading={loading}
            isEmpty={!loading && templates.length === 0 && !searchTerm}
            sortField={sortField}
            sortDir={sortDir}
            onSort={handleSort}
            getRowActions={(item) => [
              { label: 'View', onClick: () => handleViewFile(item) },
              { label: 'Download', onClick: () => handleDownloadFile(item) },
              {
                label: 'Remove',
                variant: 'danger',
                onClick: () => setRemoveTarget(item),
              },
            ]}
          />
        </div>
      </div>

      {/* Upload Modal */}
      {isUploadModalOpen && userRole === 'faculty' && (
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
