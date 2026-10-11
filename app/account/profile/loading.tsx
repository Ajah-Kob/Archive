import { PageLabel } from '@/components/globals/PageLabel'

/**
 * Streaming fallback for /account/profile.
 *
 * Mirrors FormProfile's first-paint (view) mode one-to-one: the white
 * max-w-xl card with the avatar + name + email identity header and the full
 * width Edit button block. Empty fixed-width blocks only, no text.
 */
export default function AccountProfileLoading() {
  return (
    <section className="min-h-full flex flex-col pt-[30px] px-4 sm:px-[30px] pb-[30px]">
      <PageLabel label="Profile" />

      <div className="flex flex-1 items-center justify-center py-6 overflow-y-auto">
        <div
          aria-hidden="true"
          className="w-full max-w-xl flex flex-col gap-6 rounded-[14px] border border-[#eceef8] bg-white p-6 md:p-8 shadow-[0_4px_24px_rgba(112,125,255,0.08),0_1px_4px_rgba(0,0,0,0.04)] animate-pulse motion-reduce:animate-none"
        >
          {/* Identity header — stacks below sm like the real card */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex shrink-0 flex-col items-center gap-2">
              <div className="size-24 rounded-full bg-[#e8ebf8]" />
              <div className="h-[24px] w-[64px] rounded-full bg-[#e8ebf8]" />
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <div className="h-[18px] w-[180px] max-w-full rounded bg-slate-200" />
              <div className="h-[13px] w-[220px] max-w-full rounded bg-[#e8ebf8]" />
            </div>
          </div>

          <div className="h-[40px] w-full rounded-[10px] bg-[#e8ebf8]" />
        </div>
      </div>
    </section>
  )
}
