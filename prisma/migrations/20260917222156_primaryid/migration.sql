/*
  Warnings:

  - The primary key for the `Session` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - A unique constraint covering the columns `[id,userid]` on the table `Session` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Session" DROP CONSTRAINT "Session_pkey",
ADD CONSTRAINT "Session_pkey" PRIMARY KEY ("id");

-- CreateIndex
CREATE UNIQUE INDEX "Session_id_userid_key" ON "Session"("id", "userid");
