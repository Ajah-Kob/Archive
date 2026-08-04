'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { UserMinus } from 'lucide-react'
import { StudentList } from '@/components/sections/students/StudentList'
import { RemoveStudentModal } from './RemoveStudentModal'
import type { StudentData } from '@/components/sections/students/StudentDataRow'

interface MySectionStudentsProps {
  students: StudentData[]
}

export function MySectionStudents({ students }: MySectionStudentsProps) {
  const router = useRouter()
  const [removeTarget, setRemoveTarget] = useState<StudentData | null>(null)

  return (
    <>
      <StudentList
        students={students}
        renderActions={(student) => (
          <button
            type="button"
            onClick={() => setRemoveTarget(student)}
            className="flex gap-[6px] items-center h-[30px] px-[10px] rounded-[8px] font-sans font-bold text-[12px] leading-[18px] text-[#ef4444] hover:bg-red-50 transition-colors cursor-pointer"
          >
            <UserMinus className="size-[13px]" />
            Remove
          </button>
        )}
      />

      {removeTarget && (
        <RemoveStudentModal
          student={removeTarget}
          onClose={() => setRemoveTarget(null)}
          onSuccess={() => {
            setRemoveTarget(null)
            router.refresh()
          }}
        />
      )}
    </>
  )
}
