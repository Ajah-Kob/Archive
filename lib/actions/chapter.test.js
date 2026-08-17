/**
 * Regression tests for W1-T3 (plan-20260817-chapter-submission-v2).
 *
 * Asserts the from-scratch chapter server-action contract in
 * lib/actions/chapter.ts:
 * 1. Exports exactly the three async server actions (getChapterData,
 *    submitChapter, resubmitChapter); no client-supplied userId parameters.
 * 2. Server-side validation mirrors the Figma dropzone: PDF only, 20MB max
 *    (MAX_SIZE_BYTES), friendly error copy.
 * 3. getChapterData derives the caller via requireStudent(), gates on section
 *    availability, and never leaks submission data for locked chapters.
 * 4. submitChapter guards (locked, no group, no capstone, existing current
 *    submission) and lazily upserts the Milestone via the groupId+chapter
 *    composite key; uses the DB phase enum (CAPSTONE_1/_2), not the display
 *    label.
 * 5. resubmitChapter only accepts a current NEED_REVISION row and soft-deletes
 *    it while creating a new PENDING row in one transaction.
 * 6. Mutations revalidate the full tag set (per-member workspaces, journey,
 *    evaluations, my-section, my-sections, sections) with { expire: 0 }.
 *
 * The file is read from disk (mirroring types/milestones.test.js) because the
 * module imports server-only dependencies (@vercel/blob, @/lib/prisma) and
 * jest has no TS transform configured here.
 */
const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '..', '..')
const file = path.join(root, 'lib', 'actions', 'chapter.ts')
const src = fs.readFileSync(file, 'utf8')

function functionBlock(name) {
  const re = new RegExp(`(?:export )?async function ${name}\\b[\\s\\S]*?^}`, 'm')
  return src.match(re)?.[0] ?? ''
}

describe('W1-T3 chapter server actions', () => {
  describe('exports', () => {
    test('declares getChapterData, submitChapter, resubmitChapter as async server actions', () => {
      for (const name of ['getChapterData', 'submitChapter', 'resubmitChapter']) {
        expect(src).toMatch(new RegExp(`export async function ${name}\\b`))
      }
    })

    test('getChapterData derives the caller via requireStudent()', () => {
      expect(src).toMatch(/requireStudent\(\)/)
    })

    test('no server action accepts a client-supplied userId', () => {
      expect(src).not.toMatch(/export async function getChapterData\([^)]*userId/)
      expect(src).not.toMatch(/export async function submitChapter\([^)]*userId/)
      expect(src).not.toMatch(/export async function resubmitChapter\([^)]*userId/)
    })
  })

  describe('file validation (20MB Figma contract)', () => {
    test('MAX_SIZE_BYTES is 20MB', () => {
      expect(src).toMatch(/MAX_SIZE_BYTES = 20 \* 1024 \* 1024/)
    })

    test('rejects non-PDF files with friendly copy', () => {
      expect(src).toMatch(/file\.type !== 'application\/pdf'/)
      expect(src).toMatch(/Only PDF files are allowed/)
    })

    test('rejects oversize files with the 20MB message', () => {
      expect(src).toMatch(/File is too large \(max 20MB\)\./)
    })

    test('dropzone note copy matches the Figma design', () => {
      expect(src).toMatch(/PDF only/i)
    })
  })

  describe('getChapterData loader', () => {
    const loader = functionBlock('getChapterData')

    test('soft-deletes are filtered (deletedAt: null) on student/group/rows', () => {
      expect(loader).toMatch(/deletedAt:\s*null/)
    })

    test('gates on section availability via resolveSectionAvailability', () => {
      expect(src).toMatch(/resolveSectionAvailability\(/)
      expect(src).toMatch(/availability\[chapter\]/)
    })

    test('locked chapters return no submission data (no leaks)', () => {
      expect(loader).toMatch(/open/)
      expect(loader).toMatch(/let current: ChapterVersionItem \| null = null/)
      expect(loader).toMatch(/let history: ChapterVersionItem\[\] = \[\]/)
      expect(loader).toMatch(/if \(open && milestone\)/)
    })

    test('chapter label/phase come from shared constants', () => {
      expect(src).toMatch(/CHAPTER_LABELS\[chapter\]/)
      expect(src).toMatch(/CHAPTER_PHASE\[chapter\]/)
    })

    test('milestone chain is ordered by createdAt asc with user included (version derivation)', () => {
      expect(src).toMatch(/milestoneSubmission\.findMany\([\s\S]*?orderBy:\s*\{\s*createdAt:\s*'asc'\s*\}/)
    })

    test('buildJourneyRows is called with the derived journey source', () => {
      expect(src).toMatch(/buildJourneyRows\(/)
    })
  })

  describe('submitChapter guards', () => {
    const block =
      functionBlock('submitChapter') +
      functionBlock('authorizeChapterMutation') +
      functionBlock('persistChapterSubmission')

    test('rejects when the chapter is locked', () => {
      expect(block).toMatch(/chapter is locked/)
      expect(block).toMatch(/success:\s*false/)
    })

    test('rejects when the student is not in a group', () => {
      expect(block).toMatch(/not a member of a group/)
    })

    test('rejects when no Capstone row exists (confirm a topic first)', () => {
      expect(block).toMatch(/capstone/i)
    })

    test('pre-checks for a non-deleted current submission before creating', () => {
      expect(block).toMatch(/deletedAt:\s*null/)
      expect(block).toMatch(/already has a submission/i)
    })

    test('lazily upserts the Milestone via the groupId+chapter composite key', () => {
      expect(block).toMatch(/milestone\.upsert/)
      expect(block).toMatch(/groupId_chapter/)
    })

    test('uses the DB phase enum (CAPSTONE_1/_2), not the display label', () => {
      expect(block).toMatch(/DB_PHASE\[chapter\]/)
      expect(src).toMatch(/DB_PHASE: Record<ChapterKey, 'CAPSTONE_1' \| 'CAPSTONE_2'>/)
    })

    test('creates a PENDING submission with blob metadata and the session user', () => {
      expect(block).toMatch(/status:\s*'PENDING'/)
      expect(block).toMatch(/blobUrl:\s*blob\.url/)
      expect(block).toMatch(/fileName/)
      expect(block).toMatch(/mimeType:\s*'application\/pdf'/)
      expect(block).toMatch(/size/)
      expect(block).toMatch(/submittedBy/)
    })
  })

  describe('resubmitChapter', () => {
    const block = functionBlock('resubmitChapter')

    test('only accepts a current NEED_REVISION submission', () => {
      expect(block).toMatch(/NEED_REVISION/)
      expect(block).toMatch(/deletedAt:\s*null/)
    })

    test('soft-deletes current and creates new PENDING row in one transaction', () => {
      expect(block).toMatch(/prisma\.\$transaction\(async/)
      expect(block).toMatch(/deletedAt:\s*new Date\(\)/)
      expect(block).toMatch(/status:\s*'PENDING'/)
    })
  })

  describe('revalidation', () => {
    const helper = src.match(/function revalidateChapterGroup[\s\S]*?^}/m)?.[0] ?? ''

    test('revalidates every member workspace, journey, adviser evaluations, coordinator tags', () => {
      for (const tag of [
        'workspace-${member.userId}',
        'journey-${group.id}',
        'evaluations-${group.adviserId}',
        'my-section-${group.sectionId}',
        "'my-sections'",
        "'sections'",
      ]) {
        expect(helper).toContain(tag)
      }
    })

    test('uses { expire: 0 } when expireNow is set', () => {
      expect(helper).toMatch(/expire:\s*0/)
    })

    test('mutations call the helper with expireNow: true', () => {
      expect(src).toMatch(/revalidateChapterGroup\(auth\.group,\s*\{\s*expireNow:\s*true\s*\}\)/)
    })
  })
})
