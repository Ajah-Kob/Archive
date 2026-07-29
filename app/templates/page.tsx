'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Upload } from 'lucide-react'
import { useSession } from 'next-auth/react'
import TemplatesToolbar from '@/components/templates/main/TemplatesToolbar'
import TemplateTable from '@/components/templates/main/TemplatesTable'
import UploadTemplateModal from '@/components/templates/modal/UploadTemplateModal'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { getTemplates, deleteTemplate } from '@/lib/actions/template'

export type UserRole = 'student' | 'faculty'

export interface TemplateItem {
  id: number
  name: string
  category: string
  dateUploaded: string
  uploadedBy: string
  size: string
  fileUrl: string
}

export default function TemplatesPage() {
  const { data: session } = useSession()
  const userRole = (session?.user?.role as UserRole) || 'student'

  const [templates, setTemplates] = useState<TemplateItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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

  const handleRemoveFile = async (file: TemplateItem) => {
    if (!confirm(`Are you sure you want to remove ${file.name}?`)) return
    const result = await deleteTemplate(file.id)
    if (result.success) {
      fetchTemplates(searchTerm)
    } else {
      alert(result.message)
    }
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
          />

          {/* Data Table */}
          <TemplateTable
            templates={templates}
            error={loading ? null : error}
            loading={loading}
            isEmpty={!loading && templates.length === 0 && !searchTerm}
            getRowActions={(item) => [
              { label: 'View', onClick: () => handleViewFile(item) },
              {
                label: 'Remove',
                variant: 'danger',
                onClick: () => handleRemoveFile(item),
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
    </>
  )
}
