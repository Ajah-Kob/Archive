'use client'

import React from 'react'
import { createPortal } from 'react-dom'
import { X, UploadCloud, FileText } from 'lucide-react'

interface ConfirmTemplateUploadModalProps {
  /** null while no file is pending. */
  file: File | null
  /** True while the upload is in flight — disables both actions. */
  busy?: boolean
  onConfirm: () => void
  onClose: () => void
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * Second step of the template upload. The file is chosen from the OS picker
 * first, then confirmed here — so a mistap in the picker can be cancelled
 * before anything is sent.
 */
export default function ConfirmTemplateUploadModal({
  file,
  busy = false,
  onConfirm,
  onClose,
}: ConfirmTemplateUploadModalProps) {
  if (!file) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-upload-heading"
        className="relative bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 space-y-5 animate-in zoom-in-95 duration-200"
      >
        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          aria-label="Cancel upload"
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors disabled:opacity-50"
        >
          <X size={18} />
        </button>

        <div className="flex flex-col items-center text-center gap-3 pt-2">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-indigo-50 text-indigo-600">
            <UploadCloud size={24} />
          </div>
          <div>
            <h3
              id="confirm-upload-heading"
              className="text-lg font-bold text-slate-900"
            >
              Upload Template
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-xs">
              Are you sure you want to upload this file? Everyone who can view
              templates will be able to download it.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl bg-slate-50 border border-slate-200 px-4 py-3">
          <FileText size={20} className="shrink-0 text-slate-400" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-800 truncate">
              {file.name}
            </p>
            <p className="text-xs text-slate-400">{formatBytes(file.size)}</p>
          </div>
        </div>

        <div className="flex items-center justify-center gap-3 pt-1">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors border border-slate-200 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-white transition-all shadow-sm active:scale-95 bg-[#707dff] hover:bg-[#5565ff] disabled:opacity-50"
          >
            {busy ? 'Uploading…' : 'Upload'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
