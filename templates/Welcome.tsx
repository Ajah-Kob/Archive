import Aside from '@/components/globals/Aside/Aside'
import Drawer from '@/components/globals/Drawer'

export default async function TemplateWelcome({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <section className="flex h-dvh">
        <Aside />
        <main className="bg-[#f4f6ff] bg-[radial-gradient(#b8bfd8_1px,transparent_1px)] [background-size:16px_16px] flex-1 min-w-0 overflow-hidden grid grid-rows-[1fr]">
          <section className="min-h-0 overflow-hidden">{children}</section>
        </main>
      </section>
      <Drawer />
    </>
  )
}
