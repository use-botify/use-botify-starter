/*
  Warnings:

  - You are about to drop the `broadcast` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `broadcastRecipient` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `chat` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "broadcastRecipient" DROP CONSTRAINT "broadcastRecipient_broadcastId_fkey";

-- DropTable
DROP TABLE "broadcast";

-- DropTable
DROP TABLE "broadcastRecipient";

-- DropTable
DROP TABLE "chat";

-- CreateTable
CREATE TABLE "BotState" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "maintenanceEnabled" BOOLEAN NOT NULL DEFAULT false,
    "transitionInProgress" BOOLEAN NOT NULL DEFAULT false,
    "transitionStartedAt" TIMESTAMP(3),
    "updatedByAdminId" BIGINT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BotState_pkey" PRIMARY KEY ("id")
);
