-- DropForeignKey
ALTER TABLE "Section" DROP CONSTRAINT "Section_coordinatorId_fkey";

-- DropIndex
DROP INDEX "ArchivingSubmission_status_idx";

-- AlterTable
ALTER TABLE "Notification" ALTER COLUMN "readAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3);

-- CreateTable
CREATE TABLE "CapstoneArchiveFavorite" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "archiveId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CapstoneArchiveFavorite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CapstoneArchiveFavorite_userId_idx" ON "CapstoneArchiveFavorite"("userId");

-- CreateIndex
CREATE INDEX "CapstoneArchiveFavorite_archiveId_idx" ON "CapstoneArchiveFavorite"("archiveId");

-- CreateIndex
CREATE UNIQUE INDEX "CapstoneArchiveFavorite_userId_archiveId_key" ON "CapstoneArchiveFavorite"("userId", "archiveId");

-- AddForeignKey
ALTER TABLE "Section" ADD CONSTRAINT "Section_coordinatorId_fkey" FOREIGN KEY ("coordinatorId") REFERENCES "Coordinator"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CapstoneArchiveFavorite" ADD CONSTRAINT "CapstoneArchiveFavorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CapstoneArchiveFavorite" ADD CONSTRAINT "CapstoneArchiveFavorite_archiveId_fkey" FOREIGN KEY ("archiveId") REFERENCES "CapstoneArchive"("id") ON DELETE CASCADE ON UPDATE CASCADE;
