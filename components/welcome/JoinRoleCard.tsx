'use client'

import { useState } from 'react'
import { GraduationCap, Users } from 'lucide-react'
import { ArrowRight } from 'lucide-react'

interface JoinRoleCardProps {
  role: 'student' | 'faculty'
  onClick: () => void
}

const styles = {
  student: {
    icon: GraduationCap,
    iconBg: '#fe6f6f21',
    iconColor: '#fe6f6f',
    title: 'Join as Student',
    description:
      'Join your class section using the invitation code provided by your Coordinator.',
    buttonText: 'Join as Student',
    buttonGradient: 'linear-gradient(169deg, #e85e5e 0%, #fe6f6f 100%)',
    buttonShadow: '0px 4px 7px rgba(112,125,255,0.3)',
  },
  faculty: {
    icon: Users,
    iconBg: '#707cff17',
    iconColor: '#707dff',
    title: 'Join as Faculty',
    description:
      'Join the faculty using the invitation code provided by the Program Chair.',
    buttonText: 'Join as Faculty',
    buttonGradient: 'linear-gradient(169deg, #707dff 0%, #5565ff 100%)',
    buttonShadow: '0px 4px 7px rgba(112,125,255,0.3)',
  },
} as const

export function JoinRoleCard({ role, onClick }: JoinRoleCardProps) {
  const [isHovered, setIsHovered] = useState(false)

  const {
    icon: Icon,
    iconBg,
    iconColor,
    title,
    description,
    buttonText,
    buttonGradient,
    buttonShadow,
  } = styles[role]

  return (
    <div className="flex flex-col gap-[20px] bg-white rounded-[14px] shadow-[0px_2px_12px_rgba(112,125,255,0.06),0px_1px_3px_rgba(0,0,0,0.04)] p-[30px] w-[270px] h-fit">
      <div
        className="flex items-center justify-center size-[48px] rounded-[13px]"
        style={{ backgroundColor: iconBg }}
      >
        <Icon size={24} style={{ color: iconColor }} />
      </div>

      <div className="flex flex-col gap-[10px]">
        <h2 className="font-['Sora',sans-serif] text-[18px] text-[#12143a]">
          {title}
        </h2>
        <p className="text-[14px] text-[#8a93b4]">{description}</p>
      </div>

      <button
        onClick={onClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`flex items-center justify-center gap-[7px] w-full py-[10px] rounded-[10px] text-[13.5px] font-semibold text-white cursor-pointer transition-all duration-300 ${isHovered ? '-translate-y-[2px]' : ''}`}
        style={{
          backgroundImage: isHovered
            ? buttonGradient.replace('169deg', '100deg')
            : buttonGradient,
          boxShadow: isHovered
            ? '0px 8px 25px rgba(112,125,255,0.4)'
            : buttonShadow,
        }}
      >
        {buttonText}
        <ArrowRight size={15} />
      </button>
    </div>
  )
}
