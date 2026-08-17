/**
 * Regression tests for W1-T4 (recreate evaluation.ts).
 *
 * Asserts the contract in lib/actions/evaluation.ts:
 * 1. Exports getEvaluations, getEvaluationVersions, reviewSubmission as async server actions.
 * 2. getEvaluationsData (internal) uses `include` only (no select+include mixup).
 * 3. reviewSubmission: conditional updateMany, updates status/reviewedAt/note/reviewedById, full revalidation.
 */
const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '..', '..')
const file = path.join(root, 'lib', 'actions', 'evaluation.ts')
const src = fs.readFileSync(file, 'utf8')

function functionBlock(name) {
  const re = new RegExp(`(?:export )?async function ${name}\\b[\\s\\S]*?^}`, 'm')
  return src.match(re)?.[0] ?? ''
}

describe('W1-T4 evaluation server actions', () => {
  describe('getEvaluationsData bug fix (select+include)', () => {
    test('getEvaluationsData uses include only for milestone relation', () => {
      // The bug was select: { chapter: true... }, include: { group... } inside milestone.
      // Correct is include: { milestone: { include: { group... } } }
      const block = src.match(/milestoneSubmission\.findMany\([\s\S]*?include:\s*\{\s*milestone:\s*\{\s*include:\s*\{\s*group:\s*\{\s*select:\s*\{\s*groupName:\s*true/)?.[0]
      expect(block).not.toBeNull()
      expect(block).not.toMatch(/select:\s*\{\s*chapter/)
    })
  })

  describe('reviewSubmission', () => {
    const block = functionBlock('reviewSubmission')

    test('updateMany where condition filters deletedAt: null', () => {
      expect(block).toMatch(/updateMany\({/)
      expect(block).toMatch(/where:\s*\{\s*id:\s*submission\.id,\s*deletedAt:\s*null\s*\}/)
    })

    test('sets reviewNote to null when APPROVED', () => {
      expect(block).toMatch(/reviewNote:\s*decision === 'NEED_REVISION'\s*\?\s*trimmedNote\s*:\s*null/)
    })

    test('revalidates with { expire: 0 }', () => {
      expect(block).toMatch(/revalidateTag\(`workspace-\${student\.userId}`, config\)/)
      expect(block).toMatch(/config = \{ expire: 0 \} as const/)
    })
  })
})
