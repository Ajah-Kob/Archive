import { PageLabel } from '@/components/globals/PageLabel'
import FormProfile from '@/components/forms/FormProfile'
import { redirect } from 'next/navigation'
import { getMe } from '@/lib/actions/me'

export default async function AccountProfilePage() {
  const resMe = await getMe()
  const me = resMe.success ? resMe.payload : null

  if (!me) redirect('/login')

  return (
    <section className="min-h-full flex flex-col pt-[30px] px-[30px] pb-[30px]">
      <PageLabel label="Profile" />

      <div className="flex flex-1 items-center justify-center py-6">
        <FormProfile m={me} className="w-full max-w-xl" />
      </div>
    </section>
  )
}