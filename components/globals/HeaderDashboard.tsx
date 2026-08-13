import Link from 'next/link'
import NotificationPanel from '@/components/notifications/NotificationPanel'
import DrawerProfile from '@/components/globals/DrawerProfile'
import ButtonDrawer from '@/components/ui/ButtonDrawer'

export default async function HeaderDashboard() {
  return (
    <header className="h-16 shrink-0 bg-white border-b border-[#eceef8] flex items-center px-5 md:px-8">
      <div className="flex items-center gap-3">
        <ButtonDrawer />
        <Link
          href="/"
          className="font-['Sora',sans-serif] font-bold text-[14.5px] text-[#12143a] tracking-[2.1025px]"
        >
          ARCHIVE
        </Link>
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-1">
        <NotificationPanel />
        <DrawerProfile />
      </div>
    </header>
  )
}
