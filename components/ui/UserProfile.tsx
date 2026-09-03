interface UserProfileProps {
  initials: string
  name: string
  email: string
  gradient?: string
  badge?: string
  /** Override avatar tile size — panelist checklist uses 35px (Figma 1470:5094). Defaults to 32px (size-8) for backward compat. */
  avatarClassName?: string
}

export const PANELIST_AVATAR_GRADIENT =
  'linear-gradient(135deg, #1e3a8a 0%, #2d52b8 100%)'

export function UserProfile({
  initials,
  name,
  email,
  gradient,
  badge,
  avatarClassName,
}: UserProfileProps) {
  return (
    <div className="flex gap-2.5 items-center min-w-0">
      <div
        className={`flex text-center justify-center items-center rounded-full shrink-0 drop-shadow-[0_2px_2px_rgba(0,0,0,0.14)] ${avatarClassName ?? 'size-8'}`}
        style={{
          backgroundImage:
            gradient ||
            'linear-gradient(135deg, #707dff 0%, #5062f5 60%, #3a52ef 100%)',
        }}
      >
        <span className="relative font-heading text-[11.5px] font-bold leading-none text-white">
          {initials}
        </span>
      </div>
      <div className="flex flex-col min-w-0">
        <div className="flex items-center gap-[6px] min-w-0">
          <p className="font-sans font-bold text-[13px] leading-none text-[#1e2145] truncate">
            {name}
          </p>
          {badge && (
            <span className="inline-flex items-center px-[6px] py-[1px] rounded-full bg-[#f4f6ff] border border-[#e5e8ff] font-sans font-bold text-[10px] leading-none text-[#707dff] shrink-0">
              {badge}
            </span>
          )}
        </div>
        <p className="font-sans font-medium text-[11.5px] leading-[17.25px] text-[#8a93b4] truncate">
          {email}
        </p>
      </div>
    </div>
  )
}
