import { Link2, Layers, FileText, Users } from 'lucide-react'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import Link from 'next/link'

export default async function AdminHomePage() {
  const session = await getServerSession(authOptions)

  const links = [
    { label: 'Users', href: '/admin/users', icon: Users },
    { label: 'Sections', href: '/admin/sections', icon: Layers },
    { label: 'Templates', href: '/admin/templates', icon: FileText },
    { label: 'Faculties', href: '/faculty/faculties', icon: Link2 },
  ]

  return (
    <section className="min-h-full flex flex-col gap-6">
      <div className="flex flex-col">
        <h1 className="font-heading font-bold text-[26px] leading-[20.25px] text-[#10133a] tracking-[-0.135px]">
          Admin
        </h1>
        <p className="font-sans font-medium text-[13.5px] text-[#8a93b4] mt-1">
          Welcome, {session.user.name}. Manage users, sections, and templates.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {links.map((link) => {
          const Icon = link.icon
          return (
            <Link
              key={link.href}
              href={link.href}
              className="bg-white border border-[#eceef8] rounded-[14px] p-5 flex flex-col gap-3 shadow-[0_2px_12px_rgba(30,58,138,0.06)] hover:border-[#707dff] transition-colors"
            >
              <div className="size-9 bg-indigo-500/10 rounded-lg inline-flex justify-center items-center">
                <Icon className="size-4 text-indigo-500" />
              </div>
              <span className="font-sans font-semibold text-[14px] text-[#12143a]">
                {link.label}
              </span>
            </Link>
          )
        })}
      </div>
    </section>
  )
}