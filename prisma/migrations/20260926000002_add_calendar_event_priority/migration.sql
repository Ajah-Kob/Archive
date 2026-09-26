-- Add chair/admin-set priority to manual calendar events.
--
-- Purely additive: the new column defaults to 'NONE' and the new enum has no
-- dependents, so existing rows keep rendering in the neutral indigo and the
-- table is never rewritten in a way that could drop data.
CREATE TYPE "CalendarEventPriority" AS ENUM ('NONE', 'LOW', 'MEDIUM', 'HIGH');

ALTER TABLE "CalendarEvent"
  ADD COLUMN "priority" "CalendarEventPriority" NOT NULL DEFAULT 'NONE';
