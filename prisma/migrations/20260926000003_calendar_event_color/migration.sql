-- Replace the priority experiment with a palette color key.
--
-- `priority` (enum CalendarEventPriority) was added in
-- 20260926000002 for the feature/calendar-event-priority branch. The client
-- chose a plain color instead, so the column and its enum are removed here.
--
-- `colorKey` references SECTION_HEADER_PALETTE in lib/sectionHeader.ts — the
-- same six presets the section cards use. It is nullable: NULL means the
-- palette default (Purple), which is what existing rows get. Storing a key
-- rather than a hex keeps validation a fixed list and lets a palette change
-- propagate.
--
-- The one existing row had priority HIGH; that value is intentionally
-- discarded rather than translated, since the two scales are unrelated.
ALTER TABLE "CalendarEvent" ADD COLUMN "colorKey" TEXT;

-- Drop the column before its enum, or DROP TYPE fails on the dependency.
ALTER TABLE "CalendarEvent" DROP COLUMN "priority";
DROP TYPE "CalendarEventPriority";
