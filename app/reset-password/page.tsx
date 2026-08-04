import Link from 'next/link'
import FormResetPassword from '@/components/forms/FormResetPassword'

export default function ResetPassword() {
  return (
    <section className="h-dvh w-full overflow-hidden bg-[#F8F7FF] flex items-center justify-center relative p-6">
      <div className="size-72 absolute -left-16 top-16 opacity-30 bg-purple-400 rounded-full blur-[80px] pointer-events-none z-0" />
      <div className="size-64 absolute right-260 top-90 opacity-25 bg-rose-400 rounded-full blur-[80px] pointer-events-none z-0" />
      <main className="w-full max-w-[340px] flex flex-col gap-5 items-center relative z-10">
        <div className="w-full p-8 md:p-10 rounded-3xl bg-[#ffffff] shadow-[0px_4px_24px_0px_rgba(0,0,0,0.03),0px_20px_60px_-4px_rgba(112,125,255,0.16),0px_0px_0px_1px_rgba(112,125,255,0.06)] flex flex-col gap-6">
          {/* Logo Header */}
          <div className="w-full h-8 flex justify-start items-center gap-3">
            <div className="size-8 bg-gradient-to-br from-indigo-400 to-red-400 rounded-xl flex justify-center items-center text-white text-sm">
              📖
            </div>
            <span className="justify-start text-violet-950 text-md font-bold leading-5 tracking-wider">
              ARCHIVE
            </span>
          </div>

          {/* Header Section */}
          <div className="text-left flex flex-col gap-2.5">
            <h2 className="text-[#0F0E2E] text-[24px] font-sora non-italic font-bold leading-[28.8px]">
              Reset your password
            </h2>
            <p className="text-gray-500 font-inter text-[13px] non-italic font-medium leading-[20.8px]">
              Enter your new password below.
            </p>
          </div>

          <FormResetPassword className="w-full" />
        </div>

        <div className="mt-2 text-center text-sm text-slate-500 font-medium">
          <Link
            href="/login"
            className="font-medium text-indigo-400 hover:text-indigo-500 transition-colors"
          >
            Back to login
          </Link>
        </div>
      </main>
    </section>
  )
}
