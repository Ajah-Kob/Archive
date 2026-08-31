-- CreateEnum
CREATE TYPE "DefenseResubmissionStatus" AS ENUM ('PENDING', 'APPROVED');

-- CreateTable
CREATE TABLE "DefenseResubmission" (
    "id" SERIAL NOT NULL,
    "scheduleId" INTEGER NOT NULL,
    "submittedBy" INTEGER NOT NULL,
    "fileName" TEXT NOT NULL,
    "blobUrl" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "DefenseResubmission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DefenseResubmission_scheduleId_idx" ON "DefenseResubmission"("scheduleId");

-- CreateIndex
CREATE INDEX "DefenseResubmission_deletedAt_idx" ON "DefenseResubmission"("deletedAt");

-- AddForeignKey
ALTER TABLE "DefenseResubmission" ADD CONSTRAINT "DefenseResubmission_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "DefenseSchedule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DefenseResubmission" ADD CONSTRAINT "DefenseResubmission_submittedBy_fkey" FOREIGN KEY ("submittedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "DefenseResubmissionReview" (
    "id" SERIAL NOT NULL,
    "resubmissionId" INTEGER NOT NULL,
    "panelistId" INTEGER NOT NULL,
    "status" "DefenseResubmissionStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "DefenseResubmissionReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DefenseResubmissionReview_resubmissionId_panelistId_key" ON "DefenseResubmissionReview"("resubmissionId", "panelistId");

-- CreateIndex
CREATE INDEX "DefenseResubmissionReview_deletedAt_idx" ON "DefenseResubmissionReview"("deletedAt");

-- AddForeignKey
ALTER TABLE "DefenseResubmissionReview" ADD CONSTRAINT "DefenseResubmissionReview_resubmissionId_fkey" FOREIGN KEY ("resubmissionId") REFERENCES "DefenseResubmission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DefenseResubmissionReview" ADD CONSTRAINT "DefenseResubmissionReview_panelistId_fkey" FOREIGN KEY ("panelistId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
