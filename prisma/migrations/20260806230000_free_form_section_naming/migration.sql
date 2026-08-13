-- DropIndex
DROP INDEX "Section_section_key";

-- AlterTable
ALTER TABLE "Section" DROP COLUMN "yearLevel";

-- CreateIndex
CREATE UNIQUE INDEX "Section_coordinatorId_section_key" ON "Section"("coordinatorId", "section");
