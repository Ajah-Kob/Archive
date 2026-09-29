import { describe, expect, test } from '@jest/globals'
import {
  derivePanelistResubmissionState,
  deriveResubmissionActivity,
} from '@/lib/defense/session-helpers'

/**
 * The faculty resubmission tab is panelist-specific: a panelist's own verdict
 * must never be coloured by a peer's pending review, and the card must show the
 * version THIS panelist approved rather than the newest file. These pin both,
 * plus the activity feed that replaced the approval checklist.
 */

const chair = 2
const coordinatorOne = 3
const coordinatorTwo = 4

/** v2 reviewed by all three; v3 arrived later. */
function twoVersions() {
  return [
    {
      version: 2,
      isInitial: false,
      dateSubmitted: '2026-09-21T03:03:11.721Z',
      submittedByName: 'Juan Dela Cruz',
      reviews: [
        { panelistId: chair, name: 'Program Chair', status: 'APPROVED', reviewedAt: '2026-09-22T10:00:00.000Z' },
        { panelistId: coordinatorOne, name: 'Coordinator One', status: 'PENDING', reviewedAt: null },
        { panelistId: coordinatorTwo, name: 'Coordinator Two', status: 'PENDING', reviewedAt: null },
      ],
    },
    {
      version: 3,
      isInitial: false,
      dateSubmitted: '2026-09-25T09:00:00.000Z',
      submittedByName: 'Maria Santos',
      // Carry-forward: APPROVED persists, PENDING stays PENDING.
      reviews: [
        { panelistId: chair, name: 'Program Chair', status: 'APPROVED', reviewedAt: '2026-09-22T10:00:00.000Z' },
        { panelistId: coordinatorOne, name: 'Coordinator One', status: 'PENDING', reviewedAt: null },
        { panelistId: coordinatorTwo, name: 'Coordinator Two', status: 'PENDING', reviewedAt: null },
      ],
    },
  ]
}

describe('derivePanelistResubmissionState — the current panelist only', () => {
  test('an approver sees APPROVED even while peers are still PENDING', () => {
    // The bug: collective `some(PENDING)` forced FOR_REVIEW on everyone.
    const state = derivePanelistResubmissionState(chair, twoVersions())
    expect(state.status).toBe('APPROVED')
  })

  test('the approved version is the one THEY approved, not the latest', () => {
    const state = derivePanelistResubmissionState(chair, twoVersions())
    expect(state.approvedVersion).toBe(2)
  })

  test('an inherited approval is flagged as carried forward', () => {
    const state = derivePanelistResubmissionState(chair, twoVersions())
    expect(state.carriedForward).toBe(true)
  })

  test('a direct approval on the latest version is not carried forward', () => {
    const versions = [twoVersions()[1]]
    versions[0].reviews = [
      { panelistId: chair, name: 'Program Chair', status: 'APPROVED', reviewedAt: '2026-09-26T08:00:00.000Z' },
    ]
    const state = derivePanelistResubmissionState(chair, versions)
    expect(state.status).toBe('APPROVED')
    expect(state.carriedForward).toBe(false)
  })

  test('a peer approving does not make an undecided panelist APPROVED', () => {
    // Independence cuts both ways.
    const state = derivePanelistResubmissionState(coordinatorOne, twoVersions())
    expect(state.status).toBe('FOR_REVIEW')
    expect(state.approvedVersion).toBeNull()
  })

  test('requesting revision shows NEED_REVISION for that panelist', () => {
    const versions = twoVersions()
    versions[1].reviews[0] = {
      panelistId: chair,
      name: 'Program Chair',
      status: 'REDEFENSE',
      reviewedAt: '2026-09-26T08:00:00.000Z',
    }
    const state = derivePanelistResubmissionState(chair, versions)
    expect(state.status).toBe('NEED_REVISION')
  })

  test('one panelist requesting revision does not mask another approving', () => {
    const versions = twoVersions()
    versions[1].reviews[0] = {
      panelistId: coordinatorOne,
      name: 'Coordinator One',
      status: 'REDEFENSE',
      reviewedAt: '2026-09-26T08:00:00.000Z',
    }
    const state = derivePanelistResubmissionState(chair, versions)
    expect(state.status).toBe('APPROVED')
  })

  test('a panelist with no review row at all is FOR_REVIEW', () => {
    const versions = twoVersions()
    const state = derivePanelistResubmissionState(999, versions)
    expect(state.status).toBe('FOR_REVIEW')
    expect(state.approvedVersion).toBeNull()
  })

  test('no versions yields FOR_REVIEW rather than throwing', () => {
    expect(derivePanelistResubmissionState(chair, [])).toEqual({
      status: 'FOR_REVIEW',
      approvedVersion: null,
      carriedForward: false,
    })
  })
})

describe('deriveResubmissionActivity — timeline across all resubmissions', () => {
  test('lists every upload and every decision, newest first', () => {
    const feed = deriveResubmissionActivity(twoVersions())
    // v3 uploaded 09-25, so it sorts above the 09-22 approval. The approval is
    // listed once, against v2, even though the carry-forward copied the row
    // onto v3 — the event happened on v2.
    const summary = feed.map((e) => `${e.kind}:${e.actor}:v${e.version}`)
    expect(summary).toEqual([
      'UPLOAD:Maria Santos:v3',
      'APPROVED:Program Chair:v2',
      'UPLOAD:Juan Dela Cruz:v2',
    ])
  })

  test('credits the actual student who submitted each version', () => {
    const feed = deriveResubmissionActivity(twoVersions())
    const uploads = feed.filter((e) => e.kind === 'UPLOAD').map((e) => e.actor)
    expect(uploads).toEqual(['Maria Santos', 'Juan Dela Cruz'])
  })

  test('omits PENDING reviews — nothing has happened yet', () => {
    const feed = deriveResubmissionActivity(twoVersions())
    expect(feed.filter((e) => e.kind === 'REVISION_REQUESTED')).toHaveLength(0)
  })

  test('records a revision request when one exists', () => {
    const versions = twoVersions()
    versions[0].reviews[1] = {
      panelistId: coordinatorOne,
      name: 'Coordinator One',
      status: 'REDEFENSE',
      reviewedAt: '2026-09-23T11:00:00.000Z',
    }
    const feed = deriveResubmissionActivity(versions)
    expect(feed.some((e) => e.kind === 'REVISION_REQUESTED' && e.actor === 'Coordinator One')).toBe(true)
  })

  test('excludes the initial document — it is not a resubmission', () => {
    const feed = deriveResubmissionActivity([
      { version: 1, isInitial: true, dateSubmitted: '2026-09-01T00:00:00.000Z', submittedByName: 'Juan', reviews: [] },
      { version: 2, isInitial: false, dateSubmitted: '2026-09-21T00:00:00.000Z', submittedByName: 'Juan', reviews: [] },
    ])
    expect(feed).toHaveLength(1)
    expect(feed[0].version).toBe(2)
  })

  test('skips a decision with no timestamp rather than showing an undated entry', () => {
    const feed = deriveResubmissionActivity([
      {
        version: 2,
        isInitial: false,
        dateSubmitted: '2026-09-21T00:00:00.000Z',
        submittedByName: 'Juan',
        reviews: [{ panelistId: 2, name: 'Chair', status: 'APPROVED', reviewedAt: null }],
      },
    ])
    expect(feed).toHaveLength(1)
    expect(feed[0].kind).toBe('UPLOAD')
  })

  test('an upload with no submitter name falls back to the group', () => {
    const feed = deriveResubmissionActivity([
      { version: 2, isInitial: false, dateSubmitted: '2026-09-21T00:00:00.000Z', reviews: [] },
    ])
    expect(feed[0].actor).toBe('The group')
  })

  test('no resubmissions yields an empty feed', () => {
    expect(deriveResubmissionActivity([])).toEqual([])
  })
})
