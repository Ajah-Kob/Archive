-- AlterTable: make CapstoneArchive.groupId optional so admins can publish
-- standalone (group-less) archives. The existing unique index is preserved:
-- PostgreSQL allows multiple NULLs in a unique index, so uniqueness is still
-- enforced for all non-null groupId values.
ALTER TABLE "CapstoneArchive" ALTER COLUMN "groupId" DROP NOT NULL;
