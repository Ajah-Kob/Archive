import { UserPlus } from 'lucide-react'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import Link from 'next/link'

export default async function GuestHomePage() {
  const session = await getServerSession(authOptions)

  return (
    <section className="h-full flex flex-col items-center justify-center gap-6 px-8">
      <div className="flex flex-col items-center text-center max-w-md">
        <h1 className="font-heading font-bold text-[26px] leading-[20.25px] text-[#10133a] tracking-[-0.135px]">
          Welcome, {session.user.name}
        </h1>
        <p className="font-sans font-medium text-[13.5px] text-[#8a93b4] mt-2">
          Join ARCHIVE as a student or faculty member using the invitation code
          provided by your coordinator or the program chair.
        </p>
      </div>

      <Link
        href="/guest/join-archive"
        className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-br from-[#707dff] via-[#707dff] to-[#5555ff] text-white rounded-xl text-sm font-semibold shadow-sm hover:shadow-md hover:shadow-indigo-500/20 transition-all duration-500 active:scale-95"
      >
        <UserPlus size={16} />
        <span>Join Archive</span>
      </Link>
    </section>
  )
}