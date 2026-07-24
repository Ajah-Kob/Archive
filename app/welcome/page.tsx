'use client'

import { useState } from 'react'
import { WelcomeBanner } from '@/components/welcome/main/WelcomeBanner'
import { WelcomeHeading } from '@/components/welcome/main/WelcomeHeading'
import { JoinFacultyModal } from '@/components/welcome/modal/JoinFacultyModal'
import { JoinSectionModal } from '@/components/welcome/modal/JoinSectionModal'
import { useWelcomeModal } from '@/store/useWelcomeModal'
import {
  JoinAsStudentWelcomeCard,
  JoinAsFacultyWelcomeCard,
} from '@/components/welcome/main/JoinRoleWelcomeCard'

export default function WelcomePage() {
  const activeModal = useWelcomeModal((state) => state.activeModal)
  const setActiveModal = useWelcomeModal((state) => state.setActiveModal)

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
        <WelcomeBanner />
        <WelcomeHeading />
        <div className="flex items-center h-fit w-fit gap-[20px]">
          <JoinAsStudentWelcomeCard />
          <JoinAsFacultyWelcomeCard />
        </div>
      </div>

      {activeModal === 'faculty' && (
        <JoinFacultyModal />
      )}
      {activeModal === 'student' && (
        <JoinSectionModal />
      )}
    </div>
  )
}
