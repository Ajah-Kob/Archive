-- Drop stale Topic review/selection columns left over from the retired
-- 3-topic submission + coordinator review flow. The Topic table stays as the
-- single-final-topic store (Capstone.topicId still references it).
-- `background` is intentionally kept for future use.
ALTER TABLE "Topic" DROP CONSTRAINT "Topic_reviewedById_fkey";
ALTER TABLE "Topic" DROP COLUMN "reviewedById";
ALTER TABLE "Topic" DROP COLUMN "reviewedAt";
ALTER TABLE "Topic" DROP COLUMN "reviewNote";
ALTER TABLE "Topic" DROP COLUMN "selectedAt";
ALTER TABLE "Topic" DROP COLUMN "topicGroupKey";
