'use client'

import { StudentList } from '@/components/sections/students/StudentList'
import type { StudentData } from '@/components/sections/students/StudentDataRow'

interface MySectionStudentsProps {
  students: StudentData[]
}

export function MySectionStudents({ students }: MySectionStudentsProps) {
  return <StudentList students={students} />
}
