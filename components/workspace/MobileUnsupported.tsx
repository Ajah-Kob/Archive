'use client'

import { MonitorSmartphone } from 'lucide-react'

/**
 * Shown instead of a PDF workspace on a phone.
 *
 * The document review workspace is desktop-only. Its gestures — drag to pan,
 * drag to highlight, hold to move an annotation — rely on a pointer and a
 * stable hover target, and EmbedPDF's annotation layers opt out of native
 * touch scrolling (`touch-action: none`). Making that usable on a phone meant
 * reimplementing gesture arbitration that the plugins already own, and it was
 * not converging. Blocking it is honest: the feature is not offered on mobile.
 *
 * Full-page on purpose. A message inside the viewer area would still render the
 * toolbar, which invites taps that go nowhere.
 */
export function MobileUnsupported() {
  return (
    <div className="flex h-full min-h-[60vh] w-full flex-col items-center justify-center gap-4 bg-[#fafbff] px-6 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-[#f0f1fb]">
        <MonitorSmartphone className="size-6 text-[#707dff]" />
      </div>
      <div className="max-w-[22rem] space-y-1.5">
        <h2 className="font-heading text-[15px] font-bold leading-[22px] text-[#12143a]">
          Not available on mobile
        </h2>
        <p className="font-sans text-[12.5px] leading-[19px] text-[#6b7396]">
          The document review workspace needs a desktop or laptop. Please open
          this page on a computer.
        </p>
        <p className="font-sans text-[12px] leading-[18px] text-[#9aa2c0]">
          Sorry for the inconvenience.
        </p>
      </div>
    </div>
  )
}