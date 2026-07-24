export interface SeedUser {
  name: string
  email: string
  password: string
  role: 'SUPERADMIN' | 'ADMIN' | 'USER'
}

const users: SeedUser[] = [
  {
    name: 'Alice Johnson',
    email: 'alice@example.com',
    password: 'password123',
    role: 'ADMIN',
  },
  {
    name: 'Bob Smith',
    email: 'bob@example.com',
    password: 'password123',
    role: 'USER',
  },
  {
    name: 'Carol Williams',
    email: 'carol@example.com',
    password: 'password123',
    role: 'USER',
  },
  {
    name: 'Dave Brown',
    email: 'dave@example.com',
    password: 'password123',
    role: 'USER',
  },
  {
    name: 'Eve Davis',
    email: 'eve@example.com',
    password: 'password123',
    role: 'USER',
  },
  {
    name: 'Frank Miller',
    email: 'frank@example.com',
    password: 'password123',
    role: 'USER',
  },
  {
    name: 'Grace Wilson',
    email: 'grace@example.com',
    password: 'password123',
    role: 'USER',
  },
  {
    name: 'Hank Moore',
    email: 'hank@example.com',
    password: 'password123',
    role: 'USER',
  },
  {
    name: 'Ivy Taylor',
    email: 'ivy@example.com',
    password: 'password123',
    role: 'USER',
  },
  {
    name: 'Jack Anderson',
    email: 'jack@example.com',
    password: 'password123',
    role: 'USER',
  },
]

export default users
