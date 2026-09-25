import { beforeEach, describe, expect, jest, test } from '@jest/globals'
import { revalidatePath } from 'next/cache'
import { revalidateFeature } from './revalidate'

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}))

const revalidatePathMock = jest.mocked(revalidatePath)

describe('revalidateFeature', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('revalidates both canonical section management routes', () => {
    revalidateFeature('sections')

    expect(revalidatePathMock).toHaveBeenCalledTimes(2)
    expect(revalidatePathMock).toHaveBeenCalledWith('/admin/sections')
    expect(revalidatePathMock).toHaveBeenCalledWith(
      '/faculty/section-management',
    )
  })

  test('revalidates every canonical faculty management route', () => {
    revalidateFeature('faculties')

    expect(revalidatePathMock).toHaveBeenCalledTimes(3)
    expect(revalidatePathMock).toHaveBeenCalledWith(
      '/faculty/faculty-management/members',
    )
    expect(revalidatePathMock).toHaveBeenCalledWith(
      '/faculty/faculty-management/advisers',
    )
    expect(revalidatePathMock).toHaveBeenCalledWith(
      '/faculty/faculty-management/coordinators',
    )
  })
})
