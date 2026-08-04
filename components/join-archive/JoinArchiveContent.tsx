'use client'

import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import { GraduationCap, Users } from 'lucide-react'
import { useJoinArchive } from '@/store/useJoinArchive'
import { joinFaculty } from '@/lib/actions/faculty'
import { joinSection } from '@/lib/actions/sections'
import { WelcomeBanner } from '@/components/join-archive/WelcomeBanner'
import { WelcomeHeading } from '@/components/join-archive/WelcomeHeading'
import { JoinRoleCard } from '@/components/join-archive/JoinRoleCard'
import { JoinModal } from '@/components/join-archive/JoinModal'

const FACULTY_FORM_ID = 'join-faculty-form'
const STUDENT_FORM_ID = 'join-student-form'

export default function JoinArchiveContent() {
  const activeModal = useJoinArchive((s) => s.activeModal)
  const setActiveModal = useJoinArchive((s) => s.setActiveModal)
  const router = useRouter()
  const { update } = useSession()

  function handleClose() {
    setActiveModal(null)
  }

  function handleSuccess(description: string) {
    setActiveModal(null)
    toast.success("You've joined successfully!", { description })
    update()
    router.push('/dashboard')
  }

  return (
    <>
      <WelcomeBanner />
      <WelcomeHeading />
      <div className="flex items-center h-fit w-fit gap-[20px]">
        <JoinRoleCard
          icon={GraduationCap}
          label="Join as Student"
          description="Join your class section using the invitation code provided by your Coordinator."
          color="red"
          onSelect={() => setActiveModal('student')}
        />
        <JoinRoleCard
          icon={Users}
          label="Join as Faculty"
          description="Join the faculty using the invitation code provided by the Program Chair."
          color="indigo"
          onSelect={() => setActiveModal('faculty')}
        />
      </div>

      {activeModal === 'faculty' && (
        <JoinModal.Provider
          action={joinFaculty}
          onSuccess={() =>
            handleSuccess('You now have access to faculty features.')
          }
        >
          <JoinModal.Frame>
            <JoinModal.Header
              title="Join Faculty"
              description="Enter the invitation code provided by the Program Chair to become a faculty member."
              onClose={handleClose}
            />
            <JoinModal.Input formId={FACULTY_FORM_ID} />
            <JoinModal.Footer onCancel={handleClose}>
              <JoinModal.SubmitButton
                formId={FACULTY_FORM_ID}
                label="Join as Faculty"
                color="indigo"
              />
            </JoinModal.Footer>
          </JoinModal.Frame>
        </JoinModal.Provider>
      )}

      {activeModal === 'student' && (
        <JoinModal.Provider
          action={joinSection}
          onSuccess={() =>
            handleSuccess(
              'You now have access to your class section and milestone workspace.',
            )
          }
        >
          <JoinModal.Frame>
            <JoinModal.Header
              title="Join as Student"
              description="Enter the invitation code provided by your coordinator to become a student and join a section."
              onClose={handleClose}
            />
            <JoinModal.Input formId={STUDENT_FORM_ID} />
            <JoinModal.Footer onCancel={handleClose}>
              <JoinModal.SubmitButton
                formId={STUDENT_FORM_ID}
                label="Join as Student"
                color="red"
              />
            </JoinModal.Footer>
          </JoinModal.Frame>
        </JoinModal.Provider>
      )}
    </>
  )
}
