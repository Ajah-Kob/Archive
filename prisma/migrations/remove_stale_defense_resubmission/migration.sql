-- Migration: remove_stale_defense_resubmission
-- Drops stale DefenseResubmission tables + enum DefenseResubmissionStatus
-- Extends DefenseSubmissionAnnotation to rich PDF annotations mirroring SubmissionAnnotation
-- (authorId, data Json, status AnnotationStatus @default(DRAFT), @@unique([submissionId,authorId]))

-- Drop stale review table first (child FK), then parent
DROP TABLE IF EXISTS "DefenseResubmissionReview" CASCADE;
DROP TABLE IF EXISTS "DefenseResubmission" CASCADE;

-- Drop stale enum (IF EXISTS for idempotency)
DROP TYPE IF EXISTS "DefenseResubmissionStatus";

-- Alter DefenseSubmissionAnnotation: replace content:String with rich annotation fields
-- Original columns: id, submissionId, content TEXT, createdAt, updatedAt, deletedAt
-- New columns: authorId Int, data Json (JSONB), status AnnotationStatus @default(DRAFT)
-- Visibility per annotation is stored inside data JSON (item.isVisible), avoiding a separate table.

-- Remove old content column (no longer used; new data holds serialized AnnotationTransferItem[] )
ALTER TABLE "DefenseSubmissionAnnotation" DROP COLUMN IF EXISTS "content";

-- Add authorId (panelist User.id that owns this annotation row)
ALTER TABLE "DefenseSubmissionAnnotation" ADD COLUMN IF NOT EXISTS "authorId" INTEGER NOT NULL DEFAULT 0;

-- Add data JSONB (serialized AnnotationTransferItem[] with base64-encoded stamp buffers)
ALTER TABLE "DefenseSubmissionAnnotation" ADD COLUMN IF NOT EXISTS "data" JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Add status (DRAFT = private auto-save, COMMITTED = visible to group after verdict)
ALTER TABLE "DefenseSubmissionAnnotation" ADD COLUMN IF NOT EXISTS "status" "AnnotationStatus" NOT NULL DEFAULT 'DRAFT';

-- Remove default after adding (keep schema default but migration default was temporary for existing rows)
-- Note: Prisma keeps DEFAULT 'DRAFT' in schema; leaving DEFAULT is correct for new rows.
-- If the table was empty, the temporary defaults (0 / '[]') should be cleaned by backfill:
-- Existing rows (if any) will have authorId=0 and data='[]' — application should backfill or delete them.
-- For a clean install, drop the temporary defaults:
-- ALTER TABLE "DefenseSubmissionAnnotation" ALTER COLUMN "authorId" DROP DEFAULT;
-- ALTER TABLE "DefenseSubmissionAnnotation" ALTER COLUMN "data" DROP DEFAULT;

-- Drop old single-column index on submissionId (replaced by composite unique)
DROP INDEX IF EXISTS "DefenseSubmissionAnnotation_submissionId_idx";

-- Create composite unique index (@@unique([submissionId, authorId]))
CREATE UNIQUE INDEX IF NOT EXISTS "DefenseSubmissionAnnotation_submissionId_authorId_key" ON "DefenseSubmissionAnnotation"("submissionId", "authorId");

-- Ensure deletedAt index preserved (re-create if missing — prisma/migrations/20260831010000_add_defense_submissions created it)
CREATE INDEX IF NOT EXISTS "DefenseSubmissionAnnotation_deletedAt_idx" ON "DefenseSubmissionAnnotation"("deletedAt");

-- Add foreign key for authorId -> User(id) (mirrors SubmissionAnnotation_authorId_fkey)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'DefenseSubmissionAnnotation_authorId_fkey'
  ) THEN
    ALTER TABLE "DefenseSubmissionAnnotation" ADD CONSTRAINT "DefenseSubmissionAnnotation_authorId_fkey"
      FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- Clean temporary defaults for authorId/data if they were only for migration backfill
-- Keep status DEFAULT 'DRAFT' as defined in schema
ALTER TABLE "DefenseSubmissionAnnotation" ALTER COLUMN "authorId" DROP DEFAULT;
ALTER TABLE "DefenseSubmissionAnnotation" ALTER COLUMN "data" DROP DEFAULT;
