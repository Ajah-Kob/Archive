import { beforeEach, describe, expect, jest, test } from '@jest/globals'
import { revalidatePath, revalidateTag } from 'next/cache'
import { revalidateFeature } from './revalidate'

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
  revalidateTag: jest.fn(),
}))

const revalidatePathMock = jest.mocked(revalidatePath)
const revalidateTagMock = jest.mocked(revalidateTag)

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

  test('a defense write also busts the calendar feed tag and path', () => {
    revalidateFeature('defense')

    expect(revalidatePathMock).toHaveBeenCalledWith('/faculty/defense-scheduling')
    // The calendar merges DefenseSchedule rows through a 'use cache' reader —
    // without this the page serves the old schedule indefinitely.
    expect(revalidateTagMock).toHaveBeenCalledWith('calendar', 'max')
    expect(revalidatePathMock).toHaveBeenCalledWith('/calendar')
  })

  test('a calendar write busts the feed tag and its own path', () => {
    revalidateFeature('calendar')

    expect(revalidateTagMock).toHaveBeenCalledWith('calendar', 'max')
    expect(revalidatePathMock).toHaveBeenCalledWith('/calendar')
  })

  test('unrelated features leave the calendar tag alone', () => {
    revalidateFeature('users')

    expect(revalidateTagMock).not.toHaveBeenCalled()
    expect(revalidatePathMock).not.toHaveBeenCalledWith('/calendar')
  })
})
