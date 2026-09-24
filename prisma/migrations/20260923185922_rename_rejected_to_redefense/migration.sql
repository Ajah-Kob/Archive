-- Rename the Rejected verdict to Redefense in both defense enums.
-- RENAME VALUE rewrites the label in place: existing rows keep their meaning
-- with zero data migration. InvitationStatus.REJECTED is intentionally untouched.
ALTER TYPE "DefenseVerdict" RENAME VALUE 'REJECTED' TO 'REDEFENSE';
ALTER TYPE "DefenseReviewStatus" RENAME VALUE 'REJECTED' TO 'REDEFENSE';
