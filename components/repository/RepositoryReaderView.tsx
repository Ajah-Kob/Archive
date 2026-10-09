'use client'

import { useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { PdfViewer } from '@/components/archiving/PdfViewer'
import { ZoomControl } from '@/components/evaluation/workspace/ZoomControl'
import { RepositoryReaderBehaviors } from '@/components/repository/RepositoryReaderBehaviors'

/**
 * Repository reader — header bar (Back + title + zoom) over the headless
 * EmbedPDF viewer. No browser toolbar, no download button.
 *
 * The bar renders inside the EmbedPDF tree via the viewer's toolbar slot so
 * the zoom control can use the plugin hooks; the document id is null until
 * the document registers, so zoom appears once loading completes.
 *
 * Deliberately NOT gated on coarse pointers, unlike every other PDF surface:
 * this route stays readable on phones and tablets (pan-first interaction
 * carries touch). That exception is scoped to this route only.
 */
export function RepositoryReaderView({
  title,
  blobUrl,
  fileName,
}: {
  title: string
  blobUrl: string
  fileName: string
}) {
  const router = useRouter()

  return (
    <section className="flex h-full min-h-0 flex-col">
      <div className="flex-1 min-h-0">
        <PdfViewer
          src={blobUrl}
          fileName={fileName}
          toolbar={(documentId) => (
            <>
              <RepositoryReaderBehaviors documentId={documentId} />
              <div className="flex items-center gap-3 px-6 py-3 border-b border-[#f0f2fa] bg-white shrink-0">
              <button
                type="button"
                onClick={() => router.push('/repository')}
                aria-label="Back to repository"
                className="inline-flex items-center gap-0.5 font-sans font-semibold text-[13px] text-[#8a93b4] hover:text-[#5a6382] hover:bg-white/60 rounded-full px-2 py-1 transition-colors shrink-0"
              >
                <ChevronLeft className="size-4" />
                Back
              </button>
              <h1 className="flex-1 min-w-0 font-heading font-bold text-[15px] leading-[22px] text-[#10133a] truncate">
                {title}
              </h1>
              {documentId ? (
                <ZoomControl documentId={documentId} />
              ) : null}
              </div>
            </>
          )}
        />
      </div>
    </section>
  )
}
