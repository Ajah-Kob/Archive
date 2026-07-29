export default function WelcomeLoading() {
  return (
    <div className="bg-[#f4f6ff] h-full flex flex-col items-center justify-center relative overflow-hidden">
      {/* Dot grid background */}
      <div
        className="absolute size-full pointer-events-none"
        style={{
          backgroundImage:
            'radial-gradient(circle, rgba(112,125,255,0.3) 0.8px, transparent 0.8px)',
          backgroundSize: '20px 20px',
        }}
      />

      {/* Decorative gradient blobs */}
      <div
        className="absolute left-[-200px] top-[86px] w-[750px] h-[600px] rounded-[190px] pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at 40% 50%, rgba(254,111,111,0.14) 0%, rgba(127,56,56,0.07) 34%, transparent 68%)',
        }}
      />
      <div
        className="absolute right-[-200px] top-[-120px] w-[750px] h-[600px] rounded-[240px] pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at 60% 50%, rgba(112,125,255,0.18) 0%, rgba(56,63,128,0.09) 34%, transparent 68%)',
        }}
      />

      <div className="relative flex flex-col items-center gap-[30px]">
        {/* Banner skeleton */}
        <div className="flex items-center gap-[10px] bg-[rgba(112,124,255,0.1)] border border-[rgba(112,125,255,0.2)] rounded-[10px] px-[17px] py-[11px]">
          <div className="size-[14px] rounded-full bg-[rgba(112,125,255,0.2)] animate-pulse" />
          <div className="h-[13px] w-[380px] rounded bg-[rgba(112,125,255,0.15)] animate-pulse" />
        </div>

        {/* Heading skeleton */}
        <div className="flex flex-col items-center gap-3">
          <div className="h-[25px] w-[250px] rounded bg-[#e0e3f5] animate-pulse" />
          <div className="h-[15px] w-[400px] rounded bg-[#e0e3f5] animate-pulse" />
        </div>

        {/* Cards skeleton */}
        <div className="flex items-center h-fit w-fit gap-[20px]">
          <div className="flex flex-col gap-[20px] bg-white rounded-[14px] shadow-[0px_2px_12px_rgba(112,125,255,0.06),0px_1px_3px_rgba(0,0,0,0.04)] p-[30px] w-[270px]">
            <div className="size-[48px] rounded-[13px] bg-[#fee2e2] animate-pulse" />
            <div className="flex flex-col gap-[10px]">
              <div className="h-[18px] w-[130px] rounded bg-[#e0e3f5] animate-pulse" />
              <div className="h-[14px] w-full rounded bg-[#e0e3f5] animate-pulse" />
              <div className="h-[14px] w-3/4 rounded bg-[#e0e3f5] animate-pulse" />
            </div>
            <div className="h-[38px] w-full rounded-[10px] bg-gradient-to-br from-red-300 to-red-400 animate-pulse" />
          </div>

          <div className="flex flex-col gap-[20px] bg-white rounded-[14px] shadow-[0px_2px_12px_rgba(112,125,255,0.06),0px_1px_3px_rgba(0,0,0,0.04)] p-[30px] w-[270px]">
            <div className="size-[48px] rounded-[13px] bg-[#e0e5ff] animate-pulse" />
            <div className="flex flex-col gap-[10px]">
              <div className="h-[18px] w-[130px] rounded bg-[#e0e3f5] animate-pulse" />
              <div className="h-[14px] w-full rounded bg-[#e0e3f5] animate-pulse" />
              <div className="h-[14px] w-3/4 rounded bg-[#e0e3f5] animate-pulse" />
            </div>
            <div className="h-[38px] w-full rounded-[10px] bg-gradient-to-br from-indigo-300 to-indigo-400 animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  )
}
