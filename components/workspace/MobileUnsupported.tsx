'use client'

import { MonitorSmartphone } from 'lucide-react'

/**
 * Shown instead of a PDF workspace on a phone or tablet.
 *
 * The document review workspace is desktop-only. Its gestures — drag to pan,
 * drag to highlight, hold to move an annotation — rely on a pointer and a
 * stable hover target, and EmbedPDF's annotation layers opt out of native
 * touch scrolling (`touch-action: none`). Making that usable on touch meant
 * reimplementing gesture arbitration that the plugins already own, and it was
 * not converging. Blocking it is honest: the feature is not offered on touch.
 *
 * Gated on `pointer: coarse` rather than width, so it covers tablets at any
 * size — including landscape, which is wider than a laptop window — while still
 * allowing a tablet with a trackpad attached, which reports a fine pointer.
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
          Not available on mobile or tablet
        </h2>
        <p className="font-sans text-[12.5px] leading-[19px] text-[#6b7396]">
          The document review workspace needs a mouse and a desktop or laptop
          screen. Please open this page on a computer.
        </p>
        <p className="font-sans text-[12px] leading-[18px] text-[#9aa2c0]">
          Sorry for the inconvenience.
        </p>
      </div>
    </div>
  )
}