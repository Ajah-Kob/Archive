import JoinArchiveContent from '@/components/join-archive/JoinArchiveContent'
import DecorativeBackground from '@/components/join-archive/DecorativeBackground'

export default function JoinArchivePage() {
  return (
    <div className="bg-[#f4f6ff] h-full flex flex-col items-center justify-center relative overflow-hidden">
      <DecorativeBackground />
      <div className="relative flex flex-col items-center gap-[30px]">
        <JoinArchiveContent />
      </div>
    </div>
  )
}
