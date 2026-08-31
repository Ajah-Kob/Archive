-- CreateEnum
CREATE TYPE "DefenseReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "DefenseSubmission" (
    "id" SERIAL NOT NULL,
    "scheduleId" INTEGER NOT NULL,
    "submittedBy" INTEGER NOT NULL,
    "isInitial" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "fileName" TEXT NOT NULL,
    "blobUrl" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "DefenseSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DefenseSubmission_scheduleId_idx" ON "DefenseSubmission"("scheduleId");

-- CreateIndex
CREATE INDEX "DefenseSubmission_deletedAt_idx" ON "DefenseSubmission"("deletedAt");

-- AddForeignKey
ALTER TABLE "DefenseSubmission" ADD CONSTRAINT "DefenseSubmission_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "DefenseSchedule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DefenseSubmission" ADD CONSTRAINT "DefenseSubmission_submittedBy_fkey" FOREIGN KEY ("submittedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "DefenseSubmissionReview" (
    "id" SERIAL NOT NULL,
    "submissionId" INTEGER NOT NULL,
    "panelistId" INTEGER NOT NULL,
    "status" "DefenseReviewStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "DefenseSubmissionReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DefenseSubmissionReview_submissionId_panelistId_key" ON "DefenseSubmissionReview"("submissionId", "panelistId");

-- CreateIndex
CREATE INDEX "DefenseSubmissionReview_deletedAt_idx" ON "DefenseSubmissionReview"("deletedAt");

-- AddForeignKey
ALTER TABLE "DefenseSubmissionReview" ADD CONSTRAINT "DefenseSubmissionReview_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "DefenseSubmission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DefenseSubmissionReview" ADD CONSTRAINT "DefenseSubmissionReview_panelistId_fkey" FOREIGN KEY ("panelistId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "DefenseSubmissionAnnotation" (
    "id" SERIAL NOT NULL,
    "submissionId" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "DefenseSubmissionAnnotation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DefenseSubmissionAnnotation_submissionId_idx" ON "DefenseSubmissionAnnotation"("submissionId");

-- CreateIndex
CREATE INDEX "DefenseSubmissionAnnotation_deletedAt_idx" ON "DefenseSubmissionAnnotation"("deletedAt");

-- AddForeignKey
ALTER TABLE "DefenseSubmissionAnnotation" ADD CONSTRAINT "DefenseSubmissionAnnotation_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "DefenseSubmission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
