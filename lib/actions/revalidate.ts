import { revalidatePath } from 'next/cache'

// Revalidates the paths that render a given feature. Sections and Templates
// are duplicated under both the /admin and /faculty role roots, so both
// canonical paths must be invalidated after a mutation.
export function revalidateFeature(feature: 'sections' | 'templates' | 'faculties' | 'users' | 'defense' | 'archiving' | 'archives' | 'calendar' | 'audit') {
  switch (feature) {
    case 'sections':
      revalidatePath('/admin/sections')
      revalidatePath('/faculty/section-management')
      break
    case 'templates':
      revalidatePath('/admin/templates')
      revalidatePath('/faculty/templates')
      break
    case 'faculties':
      revalidatePath('/faculty/faculty-management/members')
      revalidatePath('/faculty/faculty-management/advisers')
      revalidatePath('/faculty/faculty-management/coordinators')
      break
    case 'users':
      revalidatePath('/admin/users')
      break
    case 'defense':
      revalidatePath('/faculty/defense-scheduling')
      break
    case 'archiving':
      revalidatePath('/student/milestone/archiving')
      revalidatePath('/faculty/archiving')
      revalidatePath('/repository')
      break
    case 'archives':
      revalidatePath('/repository')
      revalidatePath('/faculty/archiving')
      break
    case 'calendar':
      revalidatePath('/calendar')
      break
    case 'audit':
      revalidatePath('/admin/audit')
      break
  }
}