import { PageLabel } from '@/components/globals/PageLabel'
import FormProfile from '@/components/forms/FormProfile'
import { redirect } from 'next/navigation'
import { getMe } from '@/lib/actions/me'

export default async function AccountProfilePage() {
  const resMe = await getMe()
  const me = resMe.success ? resMe.payload : null

  if (!me) redirect('/login')

  return (
    <section className="min-h-full flex flex-col pt-[30px] px-4 sm:px-[30px] pb-[30px]">
      <PageLabel label="Profile" />

      {/* Scrolls rather than centres-and-clips: the card is ~420px tall, so a
          landscape phone in the old overflow-hidden chain lost the Save row. */}
      <div className="flex flex-1 items-center justify-center py-6 overflow-y-auto">
        <FormProfile m={me} className="w-full max-w-xl" />
      </div>
    </section>
  )
}