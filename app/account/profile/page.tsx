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

      <div className="flex flex-col">
        <h1 className="font-heading font-bold text-[26px] leading-[20.25px] text-[#10133a] tracking-[-0.135px]">
          Profile
        </h1>
        <p className="font-sans font-medium text-[13.5px] text-[#8a93b4] mt-1">
          Manage your personal information.
        </p>
      </div>

      <div className="flex-1 mt-6">
        <FormProfile m={me} className="w-full max-w-80" />
      </div>
    </section>
  )
}