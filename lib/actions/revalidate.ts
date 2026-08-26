import { revalidatePath } from 'next/cache'

// Revalidates the paths that render a given feature. Sections and Templates
// are duplicated under both the /admin and /faculty role roots, so both
// canonical paths must be invalidated after a mutation.
export function revalidateFeature(feature: 'sections' | 'templates' | 'faculties' | 'users') {
  switch (feature) {
    case 'sections':
      revalidatePath('/admin/sections')
      revalidatePath('/faculty/coordinators')
      break
    case 'templates':
      revalidatePath('/admin/templates')
      revalidatePath('/faculty/templates')
      break
    case 'faculties':
      revalidatePath('/faculty/faculties')
      break
    case 'users':
      revalidatePath('/admin/users')
      break
  }
}