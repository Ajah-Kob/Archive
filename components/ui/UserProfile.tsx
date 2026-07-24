interface UserProfileProps {
  initials: string
  name: string
  email: string
  gradient?: string
}

export function UserProfile({ initials, name, email, gradient }: UserProfileProps) {
  return (
    <div className="flex gap-2.5 items-center">
      <div
        className="flex justify-center items-center size-8 rounded-full shrink-0 drop-shadow-[0_2px_2px_rgba(0,0,0,0.14)]"
        style={{ backgroundImage: gradient || 'linear-gradient(135deg, #707dff 0%, #5062f5 60%, #3a52ef 100%)' }}
      >
        <span className="font-heading font-bold text-[11.5px] text-white tracking-[0.3456px]">
          {initials}
        </span>
      </div>
      <div className="flex flex-col">
        <p className="font-sans font-bold text-[13px] leading-[19.5px] text-[#1e2145]">{name}</p>
        <p className="font-sans font-medium text-[11.5px] leading-[17.25px] text-[#8a93b4]">{email}</p>
      </div>
    </div>
  )
}
