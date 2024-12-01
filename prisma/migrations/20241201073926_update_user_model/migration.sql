/*
  Warnings:

  - You are about to alter the column `money` on the `User` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Integer`.

*/
-- AlterTable
ALTER TABLE "User" ALTER COLUMN "money" SET DATA TYPE INTEGER;
