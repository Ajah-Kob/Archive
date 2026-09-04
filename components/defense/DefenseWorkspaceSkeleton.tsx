'use client'

export function DefenseWorkspaceSkeleton() {
  return (
    <div className="h-full w-full flex flex-col overflow-hidden bg-[#fafbff] animate-pulse">
      {/* Header — mirrors DefenseDocumentWorkspace / DefenseFinalizedWorkspaceView h-[64px] */}
      <header className="flex items-center gap-[14px] px-6 h-[64px] bg-white border-b border-[#eceef8] shrink-0">
        {/* Back */}
        <div className="h-[32px] w-[62px] rounded-[8px] bg-slate-200 shrink-0" />
        <div className="w-px h-[22px] bg-[#eceef8] shrink-0" aria-hidden="true" />
        {/* Title + status */}
        <div className="min-w-0 flex items-center gap-[10px]">
          <div className="flex flex-col gap-[6px]">
            <div className="h-[13px] w-[112px] rounded bg-slate-200" />
            <div className="h-[11px] w-[138px] rounded bg-[#e8ebf8]" />
          </div>
          <div className="h-[22px] w-[82px] rounded-full bg-[#e8ebf8] border border-[#e8ebf8] shrink-0" />
        </div>

        <div className="flex-1" />

        {/* Centered zoom — absolute centered in real header, skeletonized inline for loading */}
        <div className="hidden lg:flex items-center gap-[6px] h-[32px] px-[10px] rounded-[8px] bg-[#f4f6ff] border border-[#e5e8ff] shrink-0">
          <div className="size-[14px] rounded bg-slate-200" />
          <div className="h-[12px] w-[46px] rounded bg-slate-200" />
          <div className="size-[14px] rounded bg-slate-200" />
        </div>

        <div className="flex-1 lg:hidden" />

        {/* Actions */}
        <div className="flex items-center gap-[8px] shrink-0">
          <div className="h-[32px] w-[96px] rounded-[8px] bg-[#e8ebf8] border border-[#e8ebf8]" />
          <div className="hidden sm:block h-[32px] w-[132px] rounded-[8px] bg-slate-200" />
        </div>
      </header>

      {/* Viewer area — bg matches .epdf-viewer-area bg-[#e8eaf4] */}
      <div className="flex-1 min-h-0 flex">
        <div className="flex-1 min-h-0 relative bg-[#e8eaf4] border border-[#d8daf0] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.6)] flex items-center justify-center p-8 overflow-hidden">
          {/* PDF page placeholder */}
          <div className="w-full max-w-[580px] aspect-[1/1.414] max-h-[72vh] bg-white rounded-[10px] shadow-[0_8px_36px_rgba(20,24,62,0.12),0_1px_3px_rgba(0,0,0,0.06)] border border-[#e8ebf0] p-[28px] flex flex-col gap-[14px] overflow-hidden">
            {/* Header lines of the document */}
            <div className="flex flex-col gap-[10px] items-center pt-[10px]">
              <div className="h-[18px] w-[62%] rounded bg-slate-200" />
              <div className="h-[12px] w-[44%] rounded bg-[#e8ebf8]" />
              <div className="h-[1px] w-full bg-[#eef0f7] mt-[6px]" />
            </div>
            {/* Body lines */}
            <div className="flex flex-col gap-[9px] pt-[6px]">
              <div className="h-[11px] w-full rounded bg-[#eef0f7]" />
              <div className="h-[11px] w-[92%] rounded bg-[#eef0f7]" />
              <div className="h-[11px] w-[88%] rounded bg-[#eef0f7]" />
              <div className="h-[11px] w-[96%] rounded bg-[#eef0f7]" />
              <div className="h-[14px] w-[28%] rounded bg-slate-200 mt-[10px]" />
              <div className="h-[11px] w-full rounded bg-[#eef0f7]" />
              <div className="h-[11px] w-[90%] rounded bg-[#eef0f7]" />
              <div className="h-[11px] w-[84%] rounded bg-[#eef0f7]" />
              <div className="h-[11px] w-[78%] rounded bg-slate-200/60 mt-[10px]" />
              <div className="h-[11px] w-full rounded bg-[#eef0f7]" />
              <div className="h-[11px] w-[86%] rounded bg-[#eef0f7]" />
              {/* Image placeholder */}
              <div className="h-[112px] w-full rounded-[8px] bg-[#f4f6ff] border border-[#e8ebf0] mt-[8px]" />
              <div className="h-[11px] w-[72%] rounded bg-[#eef0f7] mt-[2px] mx-auto" />
            </div>
            {/* Page number */}
            <div className="flex justify-center pt-2">
              <div className="h-[9px] w-[36px] rounded bg-[#e8ebf8]" />
            </div>
          </div>
        </div>

        {/* Right panel closed — keep viewer full width, matching default workspace (panel null) */}
      </div>
    </div>
  )
}
