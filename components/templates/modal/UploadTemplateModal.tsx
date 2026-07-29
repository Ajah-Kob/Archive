'use client'

import React, { useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X, UploadCloud } from 'lucide-react'
import { uploadTemplate } from '@/lib/actions/template'

interface UploadTemplateModalProps {
  isOpen: boolean
  onClose: () => void
  onUploadComplete: (result: {
    success: boolean
    message: string
    payload?: { url: string; size: number; name: string } | null
  }) => void
}

export default function UploadTemplateModal({
  isOpen,
  onClose,
  onUploadComplete,
}: UploadTemplateModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const reset = () => {
    setSelectedFile(null)
    setIsDragging(false)
    setError(null)
    setIsUploading(false)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0])
      setError(null)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0])
      setError(null)
    }
  }

  const [category, setCategory] = useState<string>('TEMPLATES')

  const handleConfirmUpload = async () => {
    if (!selectedFile) return
    setIsUploading(true)
    setError(null)

    const formData = new FormData()
    formData.append('file', selectedFile)
    formData.append('category', category)

    const result = await uploadTemplate(formData)

    if (!result.success) {
      setError(result.message)
      setIsUploading(false)
      return
    }

    onUploadComplete(result)
    reset()
    onClose()
  }

  if (!isOpen) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-6 animate-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              Upload Template
            </h3>
            <p className="text-xs text-slate-500">
              Select a document file to upload.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              reset()
              onClose()
            }}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Drag & Drop File Area */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 ${
            isDragging
              ? 'border-indigo-500 bg-indigo-50/50'
              : selectedFile
                ? 'border-emerald-500 bg-emerald-50/30'
                : 'border-slate-200 hover:border-indigo-400 bg-slate-50/50'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileSelect}
            className="hidden"
            accept=".pdf,.doc,.docx"
          />

          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
              selectedFile
                ? 'bg-emerald-100 text-emerald-600'
                : 'bg-indigo-50 text-indigo-600'
            }`}
          >
            <UploadCloud size={24} />
          </div>

          {selectedFile ? (
            <div>
              <p className="text-sm font-semibold text-slate-800">
                {selectedFile.name}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Click or
                drag to replace
              </p>
            </div>
          ) : (
            <div>
              <p className="text-sm font-semibold text-slate-700">
                <span className="text-indigo-600 underline">
                  Click to upload
                </span>{' '}
                or drag and drop
              </p>
              <p className="text-xs text-slate-400 mt-1">
                PDF or Word documents (MAX. 10MB)
              </p>
            </div>
          )}
        </div>

        {/* Category selector */}
        {selectedFile && (
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600 tracking-wide uppercase">
              Category
            </label>
            <div className="flex gap-2">
              {['TEMPLATES', 'GUIDES', 'FORMS'].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${
                    category === cat
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat.charAt(0) + cat.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Error message */}
        {error && (
          <p className="text-xs font-medium text-red-500 text-center">
            {error}
          </p>
        )}

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => {
              reset()
              onClose()
            }}
            className="px-5 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!selectedFile || isUploading}
            onClick={handleConfirmUpload}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-xl text-xs font-semibold transition-all shadow-sm active:scale-95 disabled:active:scale-100"
          >
            {isUploading ? 'Uploading...' : 'Upload File'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
