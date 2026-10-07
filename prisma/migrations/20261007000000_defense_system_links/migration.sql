-- CreateTable
CREATE TABLE "DefenseSystemLink" (
    "id" SERIAL NOT NULL,
    "scheduleId" INTEGER NOT NULL,
    "groupId" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "note" TEXT,
    "copiedFromId" INTEGER,
    "removedAt" TIMESTAMP(3),
    "createdById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "DefenseSystemLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemLinkComment" (
    "id" SERIAL NOT NULL,
    "linkId" INTEGER NOT NULL,
    "authorId" INTEGER NOT NULL,
    "body" TEXT NOT NULL,
    "parentId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "SystemLinkComment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DefenseSystemLink_scheduleId_idx" ON "DefenseSystemLink"("scheduleId");

-- CreateIndex
CREATE INDEX "DefenseSystemLink_groupId_idx" ON "DefenseSystemLink"("groupId");

-- CreateIndex
CREATE INDEX "DefenseSystemLink_createdById_idx" ON "DefenseSystemLink"("createdById");

-- CreateIndex
CREATE INDEX "DefenseSystemLink_deletedAt_idx" ON "DefenseSystemLink"("deletedAt");

-- CreateIndex
CREATE INDEX "SystemLinkComment_linkId_idx" ON "SystemLinkComment"("linkId");

-- CreateIndex
CREATE INDEX "SystemLinkComment_parentId_idx" ON "SystemLinkComment"("parentId");

-- CreateIndex
CREATE INDEX "SystemLinkComment_authorId_idx" ON "SystemLinkComment"("authorId");

-- CreateIndex
CREATE INDEX "SystemLinkComment_deletedAt_idx" ON "SystemLinkComment"("deletedAt");

-- AddForeignKey
ALTER TABLE "DefenseSystemLink" ADD CONSTRAINT "DefenseSystemLink_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "DefenseSchedule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DefenseSystemLink" ADD CONSTRAINT "DefenseSystemLink_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DefenseSystemLink" ADD CONSTRAINT "DefenseSystemLink_copiedFromId_fkey" FOREIGN KEY ("copiedFromId") REFERENCES "DefenseSystemLink"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DefenseSystemLink" ADD CONSTRAINT "DefenseSystemLink_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SystemLinkComment" ADD CONSTRAINT "SystemLinkComment_linkId_fkey" FOREIGN KEY ("linkId") REFERENCES "DefenseSystemLink"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SystemLinkComment" ADD CONSTRAINT "SystemLinkComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SystemLinkComment" ADD CONSTRAINT "SystemLinkComment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "SystemLinkComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
