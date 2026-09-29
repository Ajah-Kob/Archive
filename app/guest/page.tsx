import type { Metadata } from 'next'
import { PageLabel } from '@/components/globals/PageLabel'
import JoinArchiveContent from '@/components/join-archive/JoinArchiveContent'
import DecorativeBackground from '@/components/join-archive/DecorativeBackground'

export const metadata: Metadata = {
  title: 'Join Archive',
  description: 'Join Archive as a student or faculty member',
}

export default function GuestHomePage() {
  return (
    <div className="h-full flex flex-col items-center justify-center relative overflow-y-auto overflow-x-hidden">
      <PageLabel label="Join Archive" />
      <DecorativeBackground />
      {/* Gutter + explicit max width. The column is capped rather than w-fit,
          because a w-fit column sizes to its widest child -- the welcome copy
          -- so the text ran edge to edge while the cards below stayed narrow. */}
      <div className="relative flex flex-col items-center gap-[30px] w-full max-w-[560px] px-4">
        <JoinArchiveContent />
      </div>
    </div>
  )
}
