-- CreateEnum
CREATE TYPE "CalendarEventAudience" AS ENUM ('STUDENT', 'FACULTY', 'ALL');

-- AlterTable
ALTER TABLE "CalendarEvent" ADD COLUMN "audience" "CalendarEventAudience" NOT NULL DEFAULT 'ALL';

-- DropForeignKey
ALTER TABLE "CalendarEvent" DROP CONSTRAINT "CalendarEvent_sectionId_fkey";

-- DropIndex
DROP INDEX "CalendarEvent_sectionId_idx";

-- AlterTable
ALTER TABLE "CalendarEvent" DROP COLUMN "sectionId";
