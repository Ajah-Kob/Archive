'use client'

import { GraduationCap, Users } from 'lucide-react'
import { JoinOptionCard } from './JoinOptionCard'

interface WelcomeCardsProps {
  onStudentClick: () => void
  onFacultyClick: () => void
}

export function WelcomeCards({ onStudentClick, onFacultyClick }: WelcomeCardsProps) {
  return (
    <div className="flex gap-[25px]">
      <JoinOptionCard
        icon={GraduationCap}
        iconBg="#fe6f6f21"
        iconColor="#fe6f6f"
        title="Join as Student"
        description="Join your class section using the invitation code provided by your Coordinator."
        buttonText="Join as Student"
        buttonGradient="linear-gradient(169deg, #e85e5e 0%, #fe6f6f 100%)"
        buttonShadow="0px 4px 7px rgba(112,125,255,0.3)"
        onClick={onStudentClick}
      />
      
      <JoinOptionCard
        icon={Users}
        iconBg="#707cff17"
        iconColor="#707dff"
        title="Join as Faculty"
        description="Join the faculty using the invitation code provided by the Program Chair."
        buttonText="Join as Faculty"
        buttonGradient="linear-gradient(169deg, #707dff 0%, #5565ff 100%)"
        buttonShadow="0px 4px 7px rgba(112,125,255,0.3)"
        onClick={onFacultyClick}
      />
    </div>
  )
}
