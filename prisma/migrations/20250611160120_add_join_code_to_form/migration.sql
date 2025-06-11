/*
  Warnings:

  - A unique constraint covering the columns `[joinCode]` on the table `Form` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Form" ADD COLUMN     "joinCode" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Form_joinCode_key" ON "Form"("joinCode");
