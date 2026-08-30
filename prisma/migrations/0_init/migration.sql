-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUPERADMIN', 'ADMIN', 'FACULTY', 'STUDENT', 'GUEST');

-- CreateEnum
CREATE TYPE "JoinType" AS ENUM ('STUDENT', 'FACULTY');

-- CreateEnum
CREATE TYPE "InvitationRole" AS ENUM ('COORDINATOR', 'ADVISER', 'PANELIST', 'GROUP', 'ADVISER_ASSIGNMENT');

-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'CANCELLED', 'REJECTED');

-- CreateEnum
CREATE TYPE "MilestoneKey" AS ENUM ('TOPIC_SUBMISSION', 'TOPIC_SELECTION', 'CHAPTER_1', 'CHAPTER_2', 'CHAPTER_3', 'CHAPTER_4', 'CHAPTER_5', 'ARCHIVING');

-- CreateEnum
CREATE TYPE "TopicStatus" AS ENUM ('PENDING', 'APPROVED', 'NEED_REVISION');

-- CreateEnum
CREATE TYPE "CapstonePhase" AS ENUM ('CAPSTONE_1', 'CAPSTONE_2');

-- CreateEnum
CREATE TYPE "Chapter" AS ENUM ('CHAPTER_1', 'CHAPTER_2', 'CHAPTER_3', 'CHAPTER_4', 'CHAPTER_5');

-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('PENDING', 'NEED_REVISION', 'APPROVED');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "image" TEXT,
    "role" "Role" NOT NULL DEFAULT 'GUEST',
    "activatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "loggedInAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    "password" TEXT,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResetPasswordToken" (
    "id" SERIAL NOT NULL,
    "email" VARCHAR(191) NOT NULL,
    "token" VARCHAR(191) NOT NULL,
    "expires" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "idx_30320_primary" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Faculty" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "isProgramChair" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Faculty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Coordinator" (
    "id" SERIAL NOT NULL,
    "facultyId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Coordinator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Adviser" (
    "id" SERIAL NOT NULL,
    "facultyId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Adviser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JoinCode" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "type" "JoinType" NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "JoinCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invitation" (
    "id" SERIAL NOT NULL,
    "facultyId" INTEGER,
    "studentId" INTEGER,
    "groupId" INTEGER,
    "role" "InvitationRole" NOT NULL,
    "invitedById" INTEGER NOT NULL,
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Invitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Section" (
    "id" SERIAL NOT NULL,
    "joinCodeId" INTEGER,
    "coordinatorId" INTEGER NOT NULL,
    "section" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "capstone2OpenedAt" TIMESTAMP(3),

    CONSTRAINT "Section_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MilestoneAvailability" (
    "id" SERIAL NOT NULL,
    "sectionId" INTEGER NOT NULL,
    "key" "MilestoneKey" NOT NULL,
    "openedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MilestoneAvailability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Student" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "sectionId" INTEGER NOT NULL,
    "groupId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Student_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Group" (
    "id" SERIAL NOT NULL,
    "groupName" TEXT NOT NULL,
    "sectionId" INTEGER NOT NULL,
    "leaderStudentId" INTEGER,
    "adviserId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Topic" (
    "id" SERIAL NOT NULL,
    "groupId" INTEGER NOT NULL,
    "topicGroupKey" TEXT,
    "title" TEXT NOT NULL,
    "background" TEXT NOT NULL,
    "uploadedById" INTEGER,
    "status" "TopicStatus" NOT NULL DEFAULT 'PENDING',
    "reviewNote" TEXT,
    "reviewedById" INTEGER,
    "reviewedAt" TIMESTAMP(3),
    "selectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Topic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Capstone" (
    "id" SERIAL NOT NULL,
    "groupId" INTEGER NOT NULL,
    "topicId" INTEGER NOT NULL,
    "adviserId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Capstone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Milestone" (
    "id" SERIAL NOT NULL,
    "groupId" INTEGER NOT NULL,
    "phase" "CapstonePhase" NOT NULL,
    "chapter" "Chapter" NOT NULL,
    "capstoneId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Milestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MilestoneSubmission" (
    "id" SERIAL NOT NULL,
    "milestoneId" INTEGER NOT NULL,
    "submittedBy" INTEGER NOT NULL,
    "fileName" TEXT NOT NULL,
    "blobUrl" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "reviewedById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "MilestoneSubmission_pkey" PRIMARY KEY ("id")
);

-- INVARIANT: Milestone rows are NEVER soft-deleted.
-- MilestoneSubmission rows ARE soft-deleted on resubmission; the partial
-- unique index below keeps at most one live (non-deleted) submission per
-- milestone, while allowing historical rows to accumulate in the chain.
-- Do not add soft-delete behavior to Milestone.
CREATE UNIQUE INDEX "MilestoneSubmission_milestoneId_key" ON "MilestoneSubmission"("milestoneId") WHERE "deletedAt" IS NULL;
-- DROP INDEX "MilestoneSubmission_milestoneId_key";

-- CreateTable
CREATE TABLE "CapstoneArchive" (
    "id" SERIAL NOT NULL,
    "groupId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "abstract" TEXT,
    "datePublished" TIMESTAMP(3) NOT NULL,
    "fileName" TEXT NOT NULL,
    "blobUrl" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "uploadedById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "CapstoneArchive_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Template" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "blobUrl" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "uploadedById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Template_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_deletedAt_idx" ON "User"("email", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "idx_30320_resetpasswordtoken_token_key" ON "ResetPasswordToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "idx_30320_resetpasswordtoken_email_token_key" ON "ResetPasswordToken"("email", "token");

-- CreateIndex
CREATE UNIQUE INDEX "Faculty_userId_key" ON "Faculty"("userId");

-- CreateIndex
CREATE INDEX "Faculty_deletedAt_idx" ON "Faculty"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Coordinator_facultyId_key" ON "Coordinator"("facultyId");

-- CreateIndex
CREATE INDEX "Coordinator_deletedAt_idx" ON "Coordinator"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Adviser_facultyId_key" ON "Adviser"("facultyId");

-- CreateIndex
CREATE INDEX "Adviser_deletedAt_idx" ON "Adviser"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "JoinCode_code_key" ON "JoinCode"("code");

-- CreateIndex
CREATE INDEX "JoinCode_deletedAt_idx" ON "JoinCode"("deletedAt");

-- CreateIndex
CREATE INDEX "Invitation_facultyId_idx" ON "Invitation"("facultyId");

-- CreateIndex
CREATE INDEX "Invitation_studentId_idx" ON "Invitation"("studentId");

-- CreateIndex
CREATE INDEX "Invitation_groupId_idx" ON "Invitation"("groupId");

-- CreateIndex
CREATE INDEX "Invitation_invitedById_idx" ON "Invitation"("invitedById");

-- CreateIndex
CREATE INDEX "Invitation_deletedAt_idx" ON "Invitation"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Section_joinCodeId_key" ON "Section"("joinCodeId");

-- CreateIndex
CREATE INDEX "Section_deletedAt_idx" ON "Section"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Section_coordinatorId_section_key" ON "Section"("coordinatorId", "section");

-- CreateIndex
CREATE INDEX "MilestoneAvailability_sectionId_idx" ON "MilestoneAvailability"("sectionId");

-- CreateIndex
CREATE UNIQUE INDEX "MilestoneAvailability_sectionId_key_key" ON "MilestoneAvailability"("sectionId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "Student_userId_key" ON "Student"("userId");

-- CreateIndex
CREATE INDEX "Student_deletedAt_idx" ON "Student"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Group_leaderStudentId_key" ON "Group"("leaderStudentId");

-- CreateIndex
CREATE INDEX "Group_sectionId_idx" ON "Group"("sectionId");

-- CreateIndex
CREATE INDEX "Group_deletedAt_idx" ON "Group"("deletedAt");

-- CreateIndex
CREATE INDEX "Topic_groupId_idx" ON "Topic"("groupId");

-- CreateIndex
CREATE INDEX "Topic_uploadedById_idx" ON "Topic"("uploadedById");

-- CreateIndex
CREATE INDEX "Topic_status_idx" ON "Topic"("status");

-- CreateIndex
CREATE INDEX "Topic_deletedAt_idx" ON "Topic"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Capstone_groupId_key" ON "Capstone"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "Capstone_topicId_key" ON "Capstone"("topicId");

-- CreateIndex
CREATE INDEX "Capstone_topicId_idx" ON "Capstone"("topicId");

-- CreateIndex
CREATE INDEX "Capstone_adviserId_idx" ON "Capstone"("adviserId");

-- CreateIndex
CREATE INDEX "Capstone_deletedAt_idx" ON "Capstone"("deletedAt");

-- CreateIndex
CREATE INDEX "Milestone_groupId_idx" ON "Milestone"("groupId");

-- CreateIndex
CREATE INDEX "Milestone_capstoneId_idx" ON "Milestone"("capstoneId");

-- CreateIndex
CREATE INDEX "Milestone_deletedAt_idx" ON "Milestone"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Milestone_groupId_chapter_key" ON "Milestone"("groupId", "chapter");

-- CreateIndex
CREATE INDEX "MilestoneSubmission_milestoneId_idx" ON "MilestoneSubmission"("milestoneId");

-- CreateIndex
CREATE INDEX "MilestoneSubmission_submittedBy_idx" ON "MilestoneSubmission"("submittedBy");

-- CreateIndex
CREATE INDEX "MilestoneSubmission_deletedAt_idx" ON "MilestoneSubmission"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "CapstoneArchive_groupId_key" ON "CapstoneArchive"("groupId");

-- CreateIndex
CREATE INDEX "CapstoneArchive_deletedAt_idx" ON "CapstoneArchive"("deletedAt");

-- CreateIndex
CREATE INDEX "Template_deletedAt_idx" ON "Template"("deletedAt");

-- CreateIndex
CREATE INDEX "Template_uploadedById_idx" ON "Template"("uploadedById");

-- AddForeignKey
ALTER TABLE "Faculty" ADD CONSTRAINT "Faculty_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Coordinator" ADD CONSTRAINT "Coordinator_facultyId_fkey" FOREIGN KEY ("facultyId") REFERENCES "Faculty"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Adviser" ADD CONSTRAINT "Adviser_facultyId_fkey" FOREIGN KEY ("facultyId") REFERENCES "Faculty"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_facultyId_fkey" FOREIGN KEY ("facultyId") REFERENCES "Faculty"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Section" ADD CONSTRAINT "Section_joinCodeId_fkey" FOREIGN KEY ("joinCodeId") REFERENCES "JoinCode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Section" ADD CONSTRAINT "Section_coordinatorId_fkey" FOREIGN KEY ("coordinatorId") REFERENCES "Coordinator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MilestoneAvailability" ADD CONSTRAINT "MilestoneAvailability_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Group" ADD CONSTRAINT "Group_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Group" ADD CONSTRAINT "Group_leaderStudentId_fkey" FOREIGN KEY ("leaderStudentId") REFERENCES "Student"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Group" ADD CONSTRAINT "Group_adviserId_fkey" FOREIGN KEY ("adviserId") REFERENCES "Adviser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Topic" ADD CONSTRAINT "Topic_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Topic" ADD CONSTRAINT "Topic_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "Student"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Topic" ADD CONSTRAINT "Topic_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Capstone" ADD CONSTRAINT "Capstone_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Capstone" ADD CONSTRAINT "Capstone_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Capstone" ADD CONSTRAINT "Capstone_adviserId_fkey" FOREIGN KEY ("adviserId") REFERENCES "Adviser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Milestone" ADD CONSTRAINT "Milestone_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Milestone" ADD CONSTRAINT "Milestone_capstoneId_fkey" FOREIGN KEY ("capstoneId") REFERENCES "Capstone"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MilestoneSubmission" ADD CONSTRAINT "MilestoneSubmission_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "Milestone"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MilestoneSubmission" ADD CONSTRAINT "MilestoneSubmission_submittedBy_fkey" FOREIGN KEY ("submittedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MilestoneSubmission" ADD CONSTRAINT "MilestoneSubmission_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CapstoneArchive" ADD CONSTRAINT "CapstoneArchive_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CapstoneArchive" ADD CONSTRAINT "CapstoneArchive_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Template" ADD CONSTRAINT "Template_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

