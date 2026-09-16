/*
  Warnings:

  - Changed the type of `name` on the `roles` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "role" AS ENUM ('PATIENT', 'DOCTOR', 'ADMIN');

-- AlterTable
ALTER TABLE "roles" DROP COLUMN "name",
ADD COLUMN     "name" "role" NOT NULL;

-- CreateTable
CREATE TABLE "Account_Session" (
    "id" TEXT NOT NULL,
    "accountid" TEXT NOT NULL,

    CONSTRAINT "Account_Session_pkey" PRIMARY KEY ("id","accountid")
);

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- AddForeignKey
ALTER TABLE "Account_Session" ADD CONSTRAINT "Account_Session_accountid_fkey" FOREIGN KEY ("accountid") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
