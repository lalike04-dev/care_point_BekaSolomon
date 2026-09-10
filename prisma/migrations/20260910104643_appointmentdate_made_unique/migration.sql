/*
  Warnings:

  - A unique constraint covering the columns `[appointmentDate]` on the table `appointments` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "appointments_appointmentDate_key" ON "appointments"("appointmentDate");
