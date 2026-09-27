import { describe, expect, test } from '@jest/globals'
import {
  blobUrlToPathname,
  isPrivateBlobPath,
  isPrivateBlobUrl,
  toSignedBlobPath,
} from './blob'

const HOST = 'https://store.public.blob.vercel-storage.com'

describe('blobUrlToPathname', () => {
  test('extracts the pathname from a full blob URL', () => {
    expect(blobUrlToPathname(`${HOST}/archives/thesis.pdf`)).toBe('archives/thesis.pdf')
  })

  test('strips an existing signed-route prefix', () => {
    expect(blobUrlToPathname('/api/blob/archives/thesis.pdf')).toBe('archives/thesis.pdf')
  })

  test('passes a relative pathname through', () => {
    expect(blobUrlToPathname('archives/thesis.pdf')).toBe('archives/thesis.pdf')
  })

  test('returns empty string for unusable input', () => {
    expect(blobUrlToPathname(null)).toBe('')
    expect(blobUrlToPathname(undefined)).toBe('')
    expect(blobUrlToPathname('   ')).toBe('')
  })
})

describe('toSignedBlobPath', () => {
  test('routes an archive blob through the auth-gated route', () => {
    expect(toSignedBlobPath(`${HOST}/archives/thesis.pdf`)).toBe('/api/blob/archives/thesis.pdf')
  })
})

// `archives/*` joined the private set because the Blob store rejects
// `access: 'public'` — a regression here re-breaks repository uploads silently,
// because the client would fall back to a direct URL that 401s.
describe('isPrivateBlobPath', () => {
  test.each([
    'archives/thesis.pdf',
    'chapter/1/CHAPTER_1/doc.pdf',
    'defense/3/paper.pdf',
    'archiving/5/doc.pdf',
    'templates/chapter1.pdf',
    'user/4/avatar.png',
  ])('treats %s as private', (pathname) => {
    expect(isPrivateBlobPath(pathname)).toBe(true)
  })

  test('handles empty input', () => {
    expect(isPrivateBlobPath('')).toBe(false)
  })
})

describe('isPrivateBlobUrl', () => {
  test('resolves the URL before deciding', () => {
    expect(isPrivateBlobUrl(`${HOST}/archives/thesis.pdf`)).toBe(true)
    expect(isPrivateBlobUrl(`${HOST}/user/4/avatar.png`)).toBe(true)
    expect(isPrivateBlobUrl(`${HOST}/misc/unknown.png`)).toBe(false)
  })
})
