/**
 * Streaming fallback for /faculty.
 *
 * Mirrors FacultyHomePage one-for-one: the heading + welcome lines, then the
 * role-link card grid (white card, icon tile, label). Empty fixed-width
 * blocks only — no text.
 */
export default function FacultyHomeLoading() {
  return (
    <section className="min-h-full flex flex-col gap-6 pt-[30px] px-4 sm:px-[30px] pb-[30px]">
      <div aria-hidden="true" className="flex flex-col gap-6 animate-pulse">
        <div className="flex flex-col gap-2">
          <div className="h-[26px] w-40 rounded bg-slate-200" />
          <div className="h-[13px] w-56 rounded bg-[#e8ebf8]" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="bg-white border border-[#eceef8] rounded-[14px] p-5 flex flex-col gap-3 shadow-[0_2px_12px_rgba(30,58,138,0.06)]"
            >
              <div className="size-9 rounded-lg bg-[#e8ebf8]" />
              <div className="h-[14px] w-24 rounded bg-slate-200" />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
