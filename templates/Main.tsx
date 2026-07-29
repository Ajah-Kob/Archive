import HeaderDashboard from '@/components/globals/HeaderDashboard'
import FooterDashboard from '@/components/globals/FooterDashboard'
import Aside from '@/components/globals/Aside/Aside'
import Drawer from '@/components/globals/Drawer'

export default async function TemplateMain({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <section className="flex h-dvh bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:16px_16px]">
        <Aside />
        <main className="bg-[#f4f6ff] flex-1 min-w-0 overflow-hidden grid grid-rows-[1fr] p-8">
          <section className="min-h-0 overflow-hidden">{children}</section>
        </main>
      </section>
      <Drawer />
    </>
  )
}
