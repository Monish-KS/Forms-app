-- CreateTable
CREATE TABLE "FormResponseVersion" (
    "id" TEXT NOT NULL,
    "sharedResponseId" TEXT NOT NULL,
    "values" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT,

    CONSTRAINT "FormResponseVersion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FormResponseVersion_sharedResponseId_idx" ON "FormResponseVersion"("sharedResponseId");

-- CreateIndex
CREATE INDEX "FormResponseVersion_createdAt_idx" ON "FormResponseVersion"("createdAt");

-- AddForeignKey
ALTER TABLE "FormResponseVersion" ADD CONSTRAINT "FormResponseVersion_sharedResponseId_fkey" FOREIGN KEY ("sharedResponseId") REFERENCES "SharedResponse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormResponseVersion" ADD CONSTRAINT "FormResponseVersion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
