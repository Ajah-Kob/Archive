-- AlterEnum
ALTER TYPE "InvitationRole" ADD VALUE 'ADVISER_ASSIGNMENT';

-- AlterEnum
BEGIN;
CREATE TYPE "TopicStatus_new" AS ENUM ('PENDING', 'APPROVED', 'NEED_REVISION');
ALTER TABLE "public"."Topic" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Topic" ALTER COLUMN "status" TYPE "TopicStatus_new" USING ("status"::text::"TopicStatus_new");
ALTER TYPE "TopicStatus" RENAME TO "TopicStatus_old";
ALTER TYPE "TopicStatus_new" RENAME TO "TopicStatus";
DROP TYPE "public"."TopicStatus_old";
ALTER TABLE "Topic" ALTER COLUMN "status" SET DEFAULT 'PENDING';
COMMIT;

-- DropForeignKey
ALTER TABLE "Invitation" DROP CONSTRAINT "Invitation_facultyId_fkey";

-- AlterTable
ALTER TABLE "Group" ADD COLUMN     "adviserId" INTEGER,
ADD COLUMN     "leaderStudentId" INTEGER;

-- AlterTable
ALTER TABLE "Invitation" ADD COLUMN     "groupId" INTEGER,
ADD COLUMN     "studentId" INTEGER,
ALTER COLUMN "facultyId" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Group_leaderStudentId_key" ON "Group"("leaderStudentId");

-- CreateIndex
CREATE INDEX "Invitation_studentId_idx" ON "Invitation"("studentId");

-- CreateIndex
CREATE INDEX "Invitation_groupId_idx" ON "Invitation"("groupId");

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_facultyId_fkey" FOREIGN KEY ("facultyId") REFERENCES "Faculty"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Group" ADD CONSTRAINT "Group_leaderStudentId_fkey" FOREIGN KEY ("leaderStudentId") REFERENCES "Student"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Group" ADD CONSTRAINT "Group_adviserId_fkey" FOREIGN KEY ("adviserId") REFERENCES "Adviser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

