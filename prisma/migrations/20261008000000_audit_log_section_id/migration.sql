-- AlterTable
ALTER TABLE "AuditLog" ADD COLUMN     "sectionId" INTEGER;

-- CreateIndex
CREATE INDEX "AuditLog_sectionId_createdAt_idx" ON "AuditLog"("sectionId", "createdAt");
