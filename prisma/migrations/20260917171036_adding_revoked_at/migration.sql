/*
  Warnings:

  - Added the required column `revokedAt` to the `Session` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "revokedAt" TIMESTAMP(3) NOT NULL;
