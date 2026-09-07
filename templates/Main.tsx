import TopBar from '@/components/globals/TopBar'
import Aside from '@/components/globals/Aside/Aside'
import Drawer from '@/components/globals/Drawer'

export default async function TemplateMain({
  children,
  padded = true,
}: {
  children: React.ReactNode
  padded?: boolean
}) {
  return (
    <>
      <section className="flex h-dvh">
        <Aside />
        <main className="flex-1 min-w-0 flex flex-col overflow-hidden">
          <TopBar />
          <section className="flex-1 min-h-0 overflow-hidden grid grid-rows-[1fr] bg-[#f4f6ff] bg-[radial-gradient(#daddf0_1px,transparent_1px)] [background-size:20px_20px]">
            <section className="min-h-0 overflow-hidden">{children}</section>
          </section>
        </main>
      </section>
      <Drawer />
    </>
  )
}
