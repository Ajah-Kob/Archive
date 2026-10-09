-- DropForeignKey
ALTER TABLE "DefenseSystemLink" DROP CONSTRAINT "DefenseSystemLink_copiedFromId_fkey";

-- DropForeignKey
ALTER TABLE "SystemLinkComment" DROP CONSTRAINT "SystemLinkComment_parentId_fkey";

-- DropIndex
DROP INDEX "SystemLinkComment_parentId_idx";

-- AlterTable
ALTER TABLE "DefenseSystemLink" DROP COLUMN "copiedFromId";

-- AlterTable
ALTER TABLE "SystemLinkComment" DROP COLUMN "parentId";
