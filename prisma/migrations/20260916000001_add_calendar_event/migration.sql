-- CreateEnum
CREATE TYPE "CalendarEventCategory" AS ENUM ('DEADLINE', 'CUSTOM');

-- CreateTable
CREATE TABLE "CalendarEvent" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "sectionId" INTEGER,
    "category" "CalendarEventCategory" NOT NULL DEFAULT 'CUSTOM',
    "createdById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "CalendarEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CalendarEvent_sectionId_idx" ON "CalendarEvent"("sectionId");
CREATE INDEX "CalendarEvent_category_idx" ON "CalendarEvent"("category");
CREATE INDEX "CalendarEvent_startsAt_idx" ON "CalendarEvent"("startsAt");
CREATE INDEX "CalendarEvent_deletedAt_idx" ON "CalendarEvent"("deletedAt");

-- AddForeignKey
ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
