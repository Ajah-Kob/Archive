'use client'

import { useState, useRef, ChangeEvent } from 'react'
import { FileUp, FileText, UploadCloud } from 'lucide-react'

interface UploadDropzoneProps {
  onFileSelect: (file: File | null) => void
  disabled?: boolean
}

export function UploadDropzone({ onFileSelect, disabled }: UploadDropzoneProps) {
  const [file, setFile] = useState<File | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0]
      setFile(selectedFile)
      onFileSelect(selectedFile)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="flex size-[26px] items-center justify-center rounded-[7px] bg-[rgba(112,125,255,0.05)]">
          <FileUp className="size-[14px] text-[#707dff]" />
        </div>
        <span className="font-sora text-[12px] font-semibold text-[#1e3a8a]">Upload Document</span>
      </div>

      <div
        onClick={() => inputRef.current?.click()}
        className={`flex flex-col items-center justify-center rounded-[12px] border-2 border-dashed bg-[#fafbff] px-[30px] py-[22px] transition-colors cursor-pointer border-[#d0d5ea] ${disabled && 'cursor-not-allowed opacity-50'}`}
      >
        <input ref={inputRef} type="file" accept="application/pdf" className="hidden" onChange={handleFileChange} disabled={disabled} />
        {file ? (
          <div className="flex items-center gap-3">
            <FileText className="size-[24px] text-[#707dff]" />
            <span className="text-[13px] font-medium text-[#1e3a8a]">{file.name}</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="flex size-[48px] items-center justify-center rounded-[24px] bg-[#eef0fb]">
              <UploadCloud className="size-[24px] text-[#707dff]" />
            </div>
            <div className="text-center">
              <p className="text-[13px] font-medium text-[#1e3a8a]">Drag and drop your document here</p>
              <p className="text-[12px] text-[#5a6382]">or <span className="text-[#707dff] underline">browse files</span></p>
            </div>
          </div>
        )}
      </div>
      <p className="text-[11px] text-[#bbc0d8]">PDF only · Maximum file size: 20 MB</p>
    </div>
  )
}
