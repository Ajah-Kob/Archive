/**
 * Regression tests for T01-schema-changes (plan-20260817-chapter-submission).
 *
 * Asserts the schema contract and migration artifacts required by the plan:
 * 1. MilestoneSubmission gains reviewedAt/reviewNote/reviewedById + a named
 *    User relation (MilestoneSubmissionReviewer), all optional.
 * 2. Milestone gains @@unique([groupId, chapter]) for race-safe lazy creation.
 * 3. The migration ships the Postgres partial unique index on
 *    MilestoneSubmission(milestoneId) WHERE deletedAt IS NULL.
 * 4. No existing model/relation names change (additive-only schema change).
 * 5. The never-soft-delete invariant for Milestone rows is documented in the
 *    migration notes.
 */
const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '..')
const schemaPath = path.join(root, 'prisma', 'schema.prisma')
const schema = fs.readFileSync(schemaPath, 'utf8')

function modelBlock(name) {
  const re = new RegExp(`model ${name} \\{([^}]*)\\}`, 's')
  const match = schema.match(re)
  return match ? match[1] : ''
}

const user = modelBlock('User')
const milestone = modelBlock('Milestone')
const submission = modelBlock('MilestoneSubmission')

describe('T01-schema-changes', () => {
  describe('MilestoneSubmission review fields', () => {
    test('adds optional reviewedAt, reviewNote, reviewedById', () => {
      expect(submission).toContain('reviewedAt   DateTime?')
      expect(submission).toContain('reviewNote   String?')
      expect(submission).toContain('reviewedById Int?')
    })

    test('adds reviewedBy User relation named MilestoneSubmissionReviewer', () => {
      expect(submission).toMatch(
        /reviewedBy\s+User\?\s+@relation\("MilestoneSubmissionReviewer",\s*fields:\s*\[reviewedById\],\s*references:\s*\[id\]\)/
      )
    })

    test('User model declares the MilestoneSubmissionReviewer back-relation', () => {
      expect(user).toMatch(/milestoneSubmissionsReviewed\s+MilestoneSubmission\[\]\s+@relation\("MilestoneSubmissionReviewer"\)/)
    })

    test('existing User relations are preserved (no rename)', () => {
      expect(user).toContain('@relation("InvitationSender")')
      expect(user).toContain('@relation("TopicReviewer")')
    })
  })

  describe('Milestone unique key', () => {
    test('adds @@unique([groupId, chapter])', () => {
      expect(milestone).toContain('@@unique([groupId, chapter])')
    })

    test('keeps Milestone.deletedAt untouched', () => {
      expect(milestone).toContain('deletedAt   DateTime?')
    })
  })

  describe('Migration artifacts', () => {
    const migrationsDir = path.join(root, 'prisma', 'migrations')
    const targetMigrations = fs
      .readdirSync(migrationsDir)
      .filter((dir) => dir.endsWith('_chapter-submission-review-fields'))

    const migrationSql = targetMigrations.length
      ? fs.readFileSync(path.join(migrationsDir, targetMigrations[0], 'migration.sql'), 'utf8')
      : ''

    test('migration folder exists under prisma/migrations', () => {
      expect(targetMigrations).toHaveLength(1)
    })

    test('migration contains the partial unique index on (milestoneId) WHERE deletedAt IS NULL', () => {
      expect(migrationSql).toMatch(
        /CREATE UNIQUE INDEX "MilestoneSubmission_milestoneId_key" ON "MilestoneSubmission"\("milestoneId"\) WHERE "deletedAt" IS NULL/
      )
    })

    test('migration ships a matching DROP for rollback', () => {
      expect(migrationSql).toMatch(/DROP INDEX "MilestoneSubmission_milestoneId_key"/)
    })

    test('migration documents the never-soft-delete invariant for Milestone rows', () => {
      expect(migrationSql.toLowerCase()).toContain('soft-delet')
    })
  })
})