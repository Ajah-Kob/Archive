import { PageLabel } from '@/components/globals/PageLabel'

const BAR = 'bg-[#e8ebf8]'

/**
 * Streaming fallback for /account/security.
 *
 * Mirrors the security page one-to-one: the title + subtitle lines and the
 * white max-w-md FormSecurity card (three label + input blocks and the Save
 * button block, following the AuthCardSkeleton form-field pattern). Empty
 * fixed-width blocks only, no text.
 */
export default function AccountSecurityLoading() {
  return (
    <section className="min-h-full flex flex-col pt-[30px] px-4 sm:px-[30px] pb-[30px] overflow-y-auto">
      <PageLabel label="Security" />

      <div
        aria-hidden="true"
        className="flex flex-col animate-pulse motion-reduce:animate-none"
      >
        <div className="h-[26px] w-[140px] rounded bg-slate-200" />
        <div className={`h-[14px] w-[200px] rounded ${BAR} mt-1`} />
      </div>

      <div className="flex-1 mt-6">
        <div
          aria-hidden="true"
          className="w-full max-w-md mx-auto bg-white border border-[#eceef8] rounded-[14px] p-4 sm:p-6 md:p-8 shadow-[0px_4px_24px_0px_rgba(0,0,0,0.03),0px_20px_60px_-4px_rgba(112,125,255,0.16),0px_0px_0px_1px_rgba(112,125,255,0.06)] flex flex-col gap-5 animate-pulse motion-reduce:animate-none"
        >
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-1">
              <div className={`h-3 w-28 rounded ${BAR}`} />
              <div className={`h-[38px] rounded-xl ${BAR}`} />
            </div>
          ))}
          <div className={`h-[38px] rounded-[9px] ${BAR}`} />
        </div>
      </div>
    </section>
  )
}
