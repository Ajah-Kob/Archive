-- CreateEnum
CREATE TYPE "AnnotationStatus" AS ENUM ('DRAFT', 'COMMITTED');

-- CreateTable
CREATE TABLE "SubmissionAnnotation" (
    "id" SERIAL NOT NULL,
    "submissionId" INTEGER NOT NULL,
    "authorId" INTEGER NOT NULL,
    "data" JSONB NOT NULL,
    "status" "AnnotationStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "SubmissionAnnotation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SubmissionAnnotation_submissionId_authorId_key" ON "SubmissionAnnotation"("submissionId", "authorId");

-- CreateIndex
CREATE INDEX "SubmissionAnnotation_deletedAt_idx" ON "SubmissionAnnotation"("deletedAt");

-- AddForeignKey
ALTER TABLE "SubmissionAnnotation" ADD CONSTRAINT "SubmissionAnnotation_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "MilestoneSubmission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubmissionAnnotation" ADD CONSTRAINT "SubmissionAnnotation_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;