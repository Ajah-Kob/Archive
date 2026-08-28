-- CreateEnum
CREATE TYPE "DefenseType" AS ENUM ('PROPOSAL', 'FINAL');

-- CreateEnum
CREATE TYPE "DefenseVerdict" AS ENUM ('PENDING', 'APPROVED', 'MINOR_REVISION', 'MAJOR_REVISION', 'REJECTED');

-- CreateEnum
CREATE TYPE "PanelistRole" AS ENUM ('CHAIR', 'PANEL_MEMBER');

-- CreateTable
CREATE TABLE "DefenseSchedule" (
    "id" SERIAL NOT NULL,
    "groupId" INTEGER NOT NULL,
    "type" "DefenseType" NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "venue" TEXT NOT NULL,
    "verdict" "DefenseVerdict" NOT NULL DEFAULT 'PENDING',
    "createdBy" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "DefenseSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DefenseSchedule_deletedAt_idx" ON "DefenseSchedule"("deletedAt");

-- CreateIndex
CREATE INDEX "DefenseSchedule_groupId_idx" ON "DefenseSchedule"("groupId");

-- AddForeignKey
ALTER TABLE "DefenseSchedule" ADD CONSTRAINT "DefenseSchedule_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DefenseSchedule" ADD CONSTRAINT "DefenseSchedule_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "DefensePanelist" (
    "id" SERIAL NOT NULL,
    "defenseScheduleId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "role" "PanelistRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "DefensePanelist_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DefensePanelist_defenseScheduleId_idx" ON "DefensePanelist"("defenseScheduleId");

-- CreateIndex
CREATE INDEX "DefensePanelist_deletedAt_idx" ON "DefensePanelist"("deletedAt");

-- AddForeignKey
ALTER TABLE "DefensePanelist" ADD CONSTRAINT "DefensePanelist_defenseScheduleId_fkey" FOREIGN KEY ("defenseScheduleId") REFERENCES "DefenseSchedule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DefensePanelist" ADD CONSTRAINT "DefensePanelist_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
