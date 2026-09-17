/*
  Warnings:

  - Added the required column `expiresAt` to the `User_Session` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "User_Session" ADD COLUMN     "expiresAt" TIMESTAMP(3) NOT NULL;
