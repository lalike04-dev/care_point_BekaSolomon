/*
  Warnings:

  - A unique constraint covering the columns `[roleId]` on the table `role_permissions` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "role_permissions_roleId_key" ON "role_permissions"("roleId");
