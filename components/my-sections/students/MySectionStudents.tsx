'use client'

import { StudentList } from './StudentList'
import type { StudentData } from './StudentDataRow'

interface MySectionStudentsProps {
  students: StudentData[]
}

export function MySectionStudents({ students }: MySectionStudentsProps) {
  return <StudentList students={students} />
}
