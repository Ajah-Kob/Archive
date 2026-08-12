interface TopicInfoBoxProps {
  groupName: string
  title: string
  background: string
}

export function TopicInfoBox({ groupName, title, background }: TopicInfoBoxProps) {
  return (
    <div className="bg-[#fafbff] border border-[#eceef8] rounded-[10px] flex flex-col">
      <div className="px-[14px] py-[10px] border-b border-[#f0f2fa]">
        <p className="font-sans font-semibold text-[11px] leading-[16.5px] uppercase tracking-[0.6px] text-[#9ea8c6]">
          Group
        </p>
        <p className="pt-[3px] font-sans font-semibold text-[13px] leading-[19.5px] text-[#1e2145]">
          {groupName}
        </p>
      </div>
      <div className="px-[14px] py-[10px] border-b border-[#f0f2fa]">
        <p className="font-sans font-semibold text-[11px] leading-[16.5px] uppercase tracking-[0.6px] text-[#9ea8c6]">
          Title
        </p>
        <p className="pt-[3px] font-sans font-medium text-[13px] leading-[19.5px] text-[#3d4566]">
          {title}
        </p>
      </div>
      <div className="px-[14px] py-[10px]">
        <p className="font-sans font-semibold text-[11px] leading-[16.5px] uppercase tracking-[0.6px] text-[#9ea8c6]">
          Background
        </p>
        <p className="pt-[3px] font-sans font-medium text-[13px] leading-[19.5px] text-[#3d4566] whitespace-pre-wrap">
          {background}
        </p>
      </div>
    </div>
  )
}
