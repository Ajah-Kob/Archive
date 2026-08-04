export default function DecorativeBackground() {
  return (
    <>
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
    </>
  )
}
