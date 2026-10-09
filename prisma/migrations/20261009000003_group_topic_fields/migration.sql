-- AlterTable
ALTER TABLE "Group" ADD COLUMN     "topicSubmittedAt" TIMESTAMP(3),
ADD COLUMN     "topicSubmittedById" INTEGER,
ADD COLUMN     "topicTitle" TEXT;

-- AddForeignKey
ALTER TABLE "Group" ADD CONSTRAINT "Group_topicSubmittedById_fkey" FOREIGN KEY ("topicSubmittedById") REFERENCES "Student"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill from the confirmed Capstone -> Topic row per group. Groups
-- without a confirmed topic keep NULLs (no topic set yet).
UPDATE "Group" g
SET
  "topicTitle" = t."title",
  "topicSubmittedById" = t."uploadedById",
  "topicSubmittedAt" = t."createdAt"
FROM "Capstone" c
JOIN "Topic" t ON t."id" = c."topicId" AND t."deletedAt" IS NULL
WHERE c."groupId" = g."id"
  AND g."deletedAt" IS NULL;
