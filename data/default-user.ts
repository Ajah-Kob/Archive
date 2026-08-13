export type DefaultRole = 'SUPERADMIN' | 'ADMIN' | 'FACULTY' | 'STUDENT' | 'GUEST'

export interface DefaultUser {
  name: string
  email: string
  password: string
  role: DefaultRole
  isProgramChair?: boolean
  isCoordinator?: boolean
}

const defaultUsers: DefaultUser[] = [
  {
    name: 'System Administrator',
    email: 'superadmin@domain.com',
    password: 'defaultpass',
    role: 'SUPERADMIN',
  },
  {
    name: 'Program Chair',
    email: 'programchair@domain.com',
    password: 'defaultpass',
    role: 'FACULTY',
    isProgramChair: true,
  },
  {
    name: 'Program Coordinator',
    email: 'coordinator@domain.com',
    password: 'defaultpass',
    role: 'FACULTY',
    isCoordinator: true,
  },
  {
    name: 'Student One',
    email: 'student1@domain.com',
    password: 'defaultpass',
    role: 'GUEST',
  },
  {
    name: 'Student Two',
    email: 'student2@domain.com',
    password: 'defaultpass',
    role: 'GUEST',
  },
  {
    name: 'Student Three',
    email: 'student3@domain.com',
    password: 'defaultpass',
    role: 'GUEST',
  },
]

export default defaultUsers
