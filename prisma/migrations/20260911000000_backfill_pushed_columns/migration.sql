-- Backfill columns that were applied to development via `prisma db push`
-- but never captured in a migration. Without this, any database set up
-- purely with `prisma migrate deploy` (e.g. Vercel preview/production) is
-- missing these columns even though schema.prisma requires them.

-- User.avatarGradient (persisted avatar, defaults to the first gradient)
ALTER TABLE "User" ADD COLUMN "avatarGradient" TEXT NOT NULL DEFAULT 'linear-gradient(135deg, #707dff 0%, #5062f5 60%, #3a52ef 100%)';

-- Section.headerColor (coordinator-picked header palette index)
ALTER TABLE "Section" ADD COLUMN "headerColor" TEXT;

-- Section.capstone1OpenedAt (Capstone 1 phase gate, open by default)
ALTER TABLE "Section" ADD COLUMN "capstone1OpenedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;

-- DefenseSchedule.verdictSubmittedAt (when the panel verdict was submitted)
ALTER TABLE "DefenseSchedule" ADD COLUMN "verdictSubmittedAt" TIMESTAMP(3);
