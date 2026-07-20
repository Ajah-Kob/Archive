import FormLogin from '@/components/forms/FormLogin'
import Link from 'next/link'

export default function Login() {
  return (
    <section className="h-dvh w-full overflow-hidden">
      <div className="h-full w-full">
        <div className="flex flex-col md:flex-row h-full w-full">
          {/* Left Column: Authentic Card Wrapper UI */}
          <div className="flex-1 p-6 flex flex-col gap-5 items-center justify-center bg-[#F8F7FF]">
            <div className="size-72 absolute -left-16 top-16 opacity-30 bg-purple-400 rounded-full blur-[80px] pointer-events-none z-0" />
            <div className="size-64 absolute right-260 top-90 opacity-25 bg-rose-400 rounded-full blur-[80px] pointer-events-none z-0" />
            <div className="w-full max-w-[440px] p-8 md:p-10 rounded-3xl bg-[#ffffff] shadow-[0px_4px_24px_0px_rgba(0,0,0,0.03),0px_20px_60px_-4px_rgba(112,125,255,0.16),0px_0px_0px_1px_rgba(112,125,255,0.06)] flex flex-col gap-6 relative z-10">
              {/* Logo Header */}
              <div className="w-full h-8 flex justify-start items-center gap-3">
                <div className="size-8 bg-gradient-to-br from-indigo-400 to-red-400 rounded-xl flex justify-center items-center text-white text-sm">
                  📖
                </div>
                <span className="justify-start text-violet-950 text-md font-bold leading-5 tracking-wider">
                  ARCHIVE
                </span>
              </div>

              <FormLogin className="w-full" />
            </div>
          </div>

          {/* Right Column: Page info */}
          <div className="flex-1 bg-tertiary p-6 md:p-12 lg:p-16 flex flex-col justify-between items-center relative bg-linear-55 from-slate-900 via-violet-950 via 40% to-indigo-800 overflow-hidden">
            {/* glass effect */}
            <img
              className="absolute inset-0 w-full h-full object-cover opacity-100 pointer-events-none "
              src="/Glasseffect.png"
              alt="Glass background effect"
            />
            {/*blobs */}
            <div className="absolute -top-20 -right-20 size-96 opacity-20 bg-indigo-400 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-20 -left-20 w-[493px] h-[475px] opacity-20 bg-radial from-red-400 to-pink-800 rounded-full blur-3xl pointer-events-none" />

            {/* Ghost layout element to offset the vertical axis perfectly on desktop grid panels */}
            <div className="hidden md:block h-2 w-full" />

            {/* Content Container (ONLY Phrases & Headings) */}
            <div className="w-full max-w-[640px] flex flex-col gap-8 items-start relative z-10 my-auto">
              {/* Logo Header Row */}
              <div className="inline-flex justify-start items-center gap-3">
                <div className="size-10 bg-white/20 rounded-2xl outline outline-1 outline-offset-[-1px] outline-white/20 flex justify-center items-center text-white text-base backdrop-blur-md">
                  📖
                </div>
                <span className="justify-start text-white text-base font-bold leading-6 tracking-widest">
                  ARCHIVE
                </span>
              </div>

              {/* Text Info Content Stack */}
              <div className="w-full flex flex-col justify-center items-start gap-5">
                {/* Tag Badge */}
                <div className="px-3 py-1.5 bg-white/10 rounded-full outline outline-1 outline-offset-[-1px] outline-white/20 inline-flex justify-start items-center gap-2">
                  <span className="size-1.5 rounded-full bg-red-400" />
                  <span className="text-white/75 text-xs font-normal leading-4 tracking-wide">
                    Capstone Project Management
                  </span>
                </div>

                {/* Headings */}
                <div className="w-full flex flex-col justify-start items-start gap-1 sm:gap-2">
                  <h1 className="text-white text-4xl sm:text-5xl lg:text-[56px] font-extrabold tracking-tight leading-[1.1]">
                    Where Capstone
                  </h1>
                  <h1 className="bg-gradient-to-r from-red-400 to-pink-500 bg-clip-text text-transparent text-4xl sm:text-5xl lg:text-[56px] font-extrabold tracking-tight leading-[1.1] xl:whitespace-nowrap lg:whitespace-normal">
                    Work Comes Together.
                  </h1>
                </div>

                {/* Subtext Description */}
                <div className="w-full inline-flex justify-start items-center">
                  <p className="max-w-[460px] justify-start text-white/60 text-xs sm:text-sm font-normal leading-relaxed">
                    ARCHIVE unifies submission, review, and milestone tracking
                    in one organized platform — for students and faculty alike.
                  </p>
                </div>
              </div>
            </div>

            {/* FOOTER - Moved completely outside of the content container */}
            <div className="w-full flex flex-col items-center justify-center gap-2 relative z-10 pt-6 mt-auto">
              <div className="flex justify-center items-center gap-5 text-gray-400 text-[10px] font-normal font-sans leading-4">
                <Link href="#" className="hover:text-white transition-colors">
                  Help Center
                </Link>
                <Link href="#" className="hover:text-white transition-colors">
                  Privacy Policy
                </Link>
                <Link href="#" className="hover:text-white transition-colors">
                  Terms of Use
                </Link>
              </div>
              <p className="text-center text-gray-400 text-[10px] font-normal font-sans leading-4 tracking-wide">
                © 2025 ARCHIVE · Capstone Project Management Platform
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
