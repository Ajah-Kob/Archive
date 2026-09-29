import NotificationPanel from '@/components/notifications/NotificationPanel'
import DrawerProfile from '@/components/globals/DrawerProfile'
import HeaderBreadcrumb from '@/components/globals/HeaderBreadcrumb'
import ButtonDrawer from '@/components/ui/ButtonDrawer'

// Backward compat alias — HeaderDashboard was renamed to TopBar
export const HeaderDashboard = TopBar

export default async function TopBar() {
  return (
    <header className="h-16 shrink-0 bg-white border-b border-[#eceef8] flex items-center px-5 md:px-8">
      <div className="flex items-center gap-3">
        <ButtonDrawer />
        <HeaderBreadcrumb />
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-1">
        <NotificationPanel />
        <DrawerProfile />
      </div>
    </header>
  )
}
