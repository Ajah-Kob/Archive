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
    <div className="h-full flex flex-col items-center justify-center relative overflow-hidden">
      <PageLabel label="Join Archive" />
      <DecorativeBackground />
      <div className="relative flex flex-col items-center gap-[30px]">
        <JoinArchiveContent />
      </div>
    </div>
  )
}
