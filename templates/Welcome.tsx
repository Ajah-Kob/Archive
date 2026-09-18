import Aside from '@/components/globals/Aside/Aside'
import Drawer from '@/components/globals/Drawer'
import TopBar from '@/components/globals/TopBar'

export default async function TemplateWelcome({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <section className="flex h-dvh">
        <Aside />
        <main className="flex-1 min-w-0 flex flex-col overflow-hidden">
          <TopBar />
          <section className="bg-[#f4f6ff] bg-[radial-gradient(rgba(184,191,216,0.45)_1px,transparent_1px)] [background-size:24px_24px] flex-1 min-w-0 overflow-hidden grid grid-rows-[1fr]">
            <section className="min-h-0 overflow-hidden">{children}</section>
          </section>
        </main>
      </section>
      <Drawer />
    </>
  )
}
