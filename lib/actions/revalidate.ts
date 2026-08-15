import { revalidatePath } from 'next/cache'

// Revalidates the paths that render a given feature. Sections and Templates
// are duplicated under both the /admin and /faculty role roots, so both
// canonical paths must be invalidated after a mutation.
export function revalidateFeature(feature: 'sections' | 'templates' | 'faculty-list' | 'users') {
  switch (feature) {
    case 'sections':
      revalidatePath('/admin/sections')
      revalidatePath('/faculty/sections')
      break
    case 'templates':
      revalidatePath('/admin/templates')
      revalidatePath('/faculty/templates')
      break
    case 'faculty-list':
      revalidatePath('/faculty/faculty-list')
      break
    case 'users':
      revalidatePath('/admin/users')
      break
  }
}