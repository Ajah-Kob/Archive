/**
 * Streaming fallback for /admin.
 *
 * Mirrors AdminHomePage one-to-one so the swap to loaded content does not
 * reshape the page: the title + subtitle lines and the four white nav cards
 * (icon box + label line each). Empty fixed-width blocks only, no text.
 */
export default function AdminHomeLoading() {
  return (
    <section
      aria-hidden="true"
      className="min-h-full flex flex-col gap-6 pt-[30px] px-4 sm:px-[30px] pb-[30px] animate-pulse motion-reduce:animate-none"
    >
      <div className="flex flex-col gap-1">
        <div className="h-[32px] w-[120px] rounded bg-slate-200" />
        <div className="h-[14px] w-[280px] max-w-full rounded bg-[#e8ebf8]" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="bg-white border border-[#eceef8] rounded-[14px] p-5 flex flex-col gap-3 shadow-[0_2px_12px_rgba(30,58,138,0.06)]"
          >
            <div className="size-9 rounded-lg bg-[#e8ebf8]" />
            <div className="h-[14px] w-[110px] rounded bg-[#e8ebf8]" />
          </div>
        ))}
      </div>
    </section>
  )
}
