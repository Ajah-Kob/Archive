-- AlterEnum
-- Add PROPOSAL_DEFENSE and FINAL_DEFENSE to the MilestoneKey enum so
-- coordinators can unlock/lock the defense milestones in Milestone Management.
ALTER TYPE "MilestoneKey" ADD VALUE 'PROPOSAL_DEFENSE';
ALTER TYPE "MilestoneKey" ADD VALUE 'FINAL_DEFENSE';
