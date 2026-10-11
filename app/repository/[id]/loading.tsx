/**
 * Streaming fallback for /repository/[id].
 *
 * Mirrors RepositoryReaderView one-to-one: the white header bar (Back pill +
 * title line + ZoomControl slot) over the document sheet on the dotted
 * catalogue background. Empty fixed-width blocks only, no text. The zoom
 * slot is reserved even though the real control only appears once the
 * document registers, so the bar does not reflow.
 */
export default function RepositoryReaderLoading() {
  return (
    <section
      aria-hidden="true"
      className="h-full flex flex-col animate-pulse motion-reduce:animate-none"
    >
      {/* Header bar — Back + title + zoom, same metrics as the real bar */}
      <div className="flex items-center gap-3 px-6 py-3 border-b border-[#f0f2fa] bg-white shrink-0">
        <div className="h-[26px] w-[72px] rounded-full bg-[#e8ebf8] shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="h-[15px] w-[38%] rounded bg-slate-200" />
        </div>
        <div className="flex items-center gap-[2px] bg-white border border-[#eceef8] rounded-[9px] p-[4px] shrink-0">
          <div className="size-[30px] rounded-[7px] bg-[#e8ebf8]" />
          <div className="h-[12px] w-[46px] rounded bg-[#e8ebf8]" />
          <div className="size-[30px] rounded-[7px] bg-[#e8ebf8]" />
        </div>
      </div>

      {/* Document surface — dotted catalogue background with a page sheet */}
      <div className="flex-1 min-h-0 overflow-y-auto bg-[#f8f9fe] bg-[radial-gradient(circle,#dbe0f3_1px,transparent_1px)] bg-[size:22px_22px] p-4 sm:p-8">
        <div className="mx-auto w-full max-w-[820px] bg-white rounded-[12px] shadow-[0px_1px_4px_0px_rgba(0,0,0,0.04)] p-[28px] sm:p-[36px] flex flex-col gap-[14px]">
          <div className="h-[16px] w-[70%] rounded bg-slate-200" />
          <div className="h-[12px] w-[45%] rounded bg-[#e8ebf8]" />
          <div className="flex flex-col gap-[10px] pt-[8px]">
            <div className="h-[12px] w-full rounded bg-[#e8ebf8]" />
            <div className="h-[12px] w-[94%] rounded bg-[#e8ebf8]" />
            <div className="h-[12px] w-[97%] rounded bg-[#e8ebf8]" />
            <div className="h-[12px] w-[88%] rounded bg-[#e8ebf8]" />
            <div className="h-[12px] w-[92%] rounded bg-[#e8ebf8]" />
            <div className="h-[12px] w-[60%] rounded bg-[#e8ebf8]" />
          </div>
        </div>
      </div>
    </section>
  )
}
