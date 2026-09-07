-- CreateEnum
CREATE TYPE "ArchivingStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'ARCHIVED');

-- AlterTable
ALTER TABLE "CapstoneArchive" ADD COLUMN "tags" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "CapstoneArchive" ADD COLUMN "authorOrder" JSONB NOT NULL DEFAULT '[]';

-- CreateTable
CREATE TABLE "ArchivingSubmission" (
    "id" SERIAL NOT NULL,
    "groupId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "abstract" TEXT NOT NULL,
    "tags" JSONB NOT NULL DEFAULT '[]',
    "authorOrder" JSONB NOT NULL DEFAULT '[]',
    "status" "ArchivingStatus" NOT NULL DEFAULT 'DRAFT',
    "fileName" TEXT,
    "blobUrl" TEXT,
    "mimeType" TEXT,
    "size" INTEGER,
    "uploadedById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ArchivingSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ArchivingSubmission_groupId_key" ON "ArchivingSubmission"("groupId");
CREATE INDEX "ArchivingSubmission_deletedAt_idx" ON "ArchivingSubmission"("deletedAt");
CREATE INDEX "ArchivingSubmission_status_idx" ON "ArchivingSubmission"("status");

-- AddForeignKey
ALTER TABLE "ArchivingSubmission" ADD CONSTRAINT "ArchivingSubmission_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ArchivingSubmission" ADD CONSTRAINT "ArchivingSubmission_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
