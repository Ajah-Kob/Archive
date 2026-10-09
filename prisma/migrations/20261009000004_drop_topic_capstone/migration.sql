-- DropForeignKey
ALTER TABLE "Topic" DROP CONSTRAINT "Topic_groupId_fkey";

-- DropForeignKey
ALTER TABLE "Topic" DROP CONSTRAINT "Topic_uploadedById_fkey";

-- DropForeignKey
ALTER TABLE "Capstone" DROP CONSTRAINT "Capstone_groupId_fkey";

-- DropForeignKey
ALTER TABLE "Capstone" DROP CONSTRAINT "Capstone_topicId_fkey";

-- DropForeignKey
ALTER TABLE "Capstone" DROP CONSTRAINT "Capstone_adviserId_fkey";

-- DropForeignKey
ALTER TABLE "Milestone" DROP CONSTRAINT "Milestone_capstoneId_fkey";

-- DropIndex
DROP INDEX "Milestone_capstoneId_idx";

-- AlterTable
ALTER TABLE "Milestone" DROP COLUMN "capstoneId";

-- DropTable
DROP TABLE "Topic";

-- DropTable
DROP TABLE "Capstone";

-- DropEnum
DROP TYPE "TopicStatus";
