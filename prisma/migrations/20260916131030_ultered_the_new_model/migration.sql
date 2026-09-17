/*
  Warnings:

  - You are about to drop the `Account_Session` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Account_Session" DROP CONSTRAINT "Account_Session_accountid_fkey";

-- DropTable
DROP TABLE "Account_Session";

-- CreateTable
CREATE TABLE "User_Session" (
    "id" TEXT NOT NULL,
    "userid" TEXT NOT NULL,

    CONSTRAINT "User_Session_pkey" PRIMARY KEY ("id","userid")
);

-- AddForeignKey
ALTER TABLE "User_Session" ADD CONSTRAINT "User_Session_userid_fkey" FOREIGN KEY ("userid") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
