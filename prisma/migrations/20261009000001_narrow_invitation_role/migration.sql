-- Cancel any leftover PENDING rows in removed roles before narrowing the
-- enum. Coordinator assignments are direct now, and ADVISER/PANELIST were
-- never issued through live flows; any stragglers must not block the cast.
UPDATE "Invitation"
SET "status" = 'CANCELLED'
WHERE "status" = 'PENDING'
  AND "role"::text NOT IN ('GROUP', 'ADVISER_ASSIGNMENT');

-- AlterEnum
BEGIN;
CREATE TYPE "InvitationRole_new" AS ENUM ('GROUP', 'ADVISER_ASSIGNMENT');
ALTER TABLE "Invitation" ALTER COLUMN "role" TYPE "InvitationRole_new" USING ("role"::text::"InvitationRole_new");
ALTER TYPE "InvitationRole" RENAME TO "InvitationRole_old";
ALTER TYPE "InvitationRole_new" RENAME TO "InvitationRole";
DROP TYPE "InvitationRole_old";
COMMIT;
