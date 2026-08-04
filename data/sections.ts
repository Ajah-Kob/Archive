import type { SectionData } from '@/components/sections/main/SectionDataRow'

export const sectionData: SectionData[] = [
  {
    id: 1,
    coordinator: {
      initials: 'MS',
      name: 'Dr. Maria Santos',
      email: 'm.santos@university.edu',
      avatarGradient:
        'linear-gradient(135deg, #707dff 0%, #5062f5 60%, #3a52ef 100%)',
    },
    section: 'BSIS 4AG1',
    dateCreated: 'Jan 15, 2026',
    students: 28,
    groups: 4,
  },
  {
    id: 2,
    coordinator: {
      initials: 'CR',
      name: 'Dr. Carlo Reyes',
      email: 'c.reyes@university.edu',
      avatarGradient: 'linear-gradient(135deg, #fe6f6f 0%, #e85555 100%)',
    },
    section: 'BSIS 4AG2',
    dateCreated: 'Jan 20, 2026',
    students: 32,
    groups: 5,
  },
  {
    id: 3,
    coordinator: {
      initials: 'MS',
      name: 'Dr. Maria Santos',
      email: 'm.santos@university.edu',
      avatarGradient:
        'linear-gradient(135deg, #707dff 0%, #5062f5 60%, #3a52ef 100%)',
    },
    section: 'BSIS 4BG1',
    dateCreated: 'Feb 5, 2026',
    students: 25,
    groups: 3,
  },
  {
    id: 4,
    coordinator: {
      initials: 'MT',
      name: 'Prof. Manuel Tan',
      email: 'm.tan@university.edu',
      avatarGradient:
        'linear-gradient(135deg, #14b8a6 0%, #0d9488 55%, #0f766e 100%)',
    },
    section: 'BSIS 4BG2',
    dateCreated: 'Feb 10, 2026',
    students: 30,
    groups: 4,
  },
  {
    id: 5,
    coordinator: {
      initials: 'JL',
      name: 'Dr. Julia Lim',
      email: 'j.lim@university.edu',
      avatarGradient:
        'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 55%, #6d28d9 100%)',
    },
    section: 'BSIS 4CG1',
    dateCreated: 'Feb 28, 2026',
    students: 22,
    groups: 3,
  },
]
