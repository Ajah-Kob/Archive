import { Sparkles } from 'lucide-react'

/**
 * Greeting for the Program Chair.
 *
 * Uses the same visual treatment as the milestone StatusCallout — a tinted
 * rounded box, a bordered icon tile, a headline and a context line — so it
 * reads as part of the same design language. Deliberately a greeting only: it
 * carries no counts and no alert state, which is what the Alerts card is for.
 */
export function ChairWelcomeCallout({
  firstName,
  today,
}: {
  firstName: string
  today: string
}) {
  return (
    <section
      aria-live="polite"
      className="flex items-center gap-[16px] rounded-[14px] border border-[rgba(112,125,255,0.2)] bg-[rgba(112,125,255,0.07)] px-[22px] py-[18px]"
    >
      <div className="flex size-[40px] shrink-0 items-center justify-center rounded-[12px] border border-[rgba(112,125,255,0.19)] bg-[rgba(112,125,255,0.08)]">
        <Sparkles className="size-[20px] text-[#707dff]" strokeWidth={2} />
      </div>

      <div className="min-w-0 flex-1">
        <h2 className="font-['Sora',sans-serif] text-[15px] font-semibold text-[#707dff]">
          Good day, {firstName}
        </h2>
        <p className="text-[13px] leading-[20px] text-[#5a6382]">
          Here is how the program is tracking today, {today}.
        </p>
      </div>
    </section>
  )
}
