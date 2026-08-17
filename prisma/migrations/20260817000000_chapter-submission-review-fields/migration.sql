-- Migration: chapter-submission-review-fields
-- Plan: plan-20260817-chapter-submission, task T01-schema-changes
--
-- INVARIANT: Milestone rows are NEVER soft-deleted.
-- The @@unique([groupId, chapter]) constraint added below assumes Milestone
-- rows are permanent. Soft-deleting a Milestone row would block re-creation of
-- the same (groupId, chapter) under the unique constraint and would resurrect
-- stale submission chains. Do not add soft-delete behavior to Milestone.

-- AlterTable
ALTER TABLE "MilestoneSubmission" ADD COLUMN     "reviewNote" TEXT,
ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "reviewedById" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "Milestone_groupId_chapter_key" ON "Milestone"("groupId", "chapter");

-- AddForeignKey
ALTER TABLE "MilestoneSubmission" ADD CONSTRAINT "MilestoneSubmission_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
-- Postgres partial unique index (Prisma has no partial-index syntax):
-- at most one current (non-deleted) submission per milestone.
-- submitChapter maps the P2002 violation to a friendly already-submitted error.
CREATE UNIQUE INDEX "MilestoneSubmission_milestoneId_key" ON "MilestoneSubmission"("milestoneId") WHERE "deletedAt" IS NULL;

-- Down migration (rollback): drop the partial unique index last.
-- DROP INDEX "MilestoneSubmission_milestoneId_key";
