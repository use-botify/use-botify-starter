-- AlterTable
ALTER TABLE "user" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "chat" (
    "id" BIGINT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT,
    "username" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "broadcast" (
    "id" SERIAL NOT NULL,
    "fromChatId" BIGINT NOT NULL,
    "messageId" INTEGER NOT NULL,
    "target" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RUNNING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "broadcast_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "broadcastRecipient" (
    "id" SERIAL NOT NULL,
    "broadcastId" INTEGER NOT NULL,
    "targetId" BIGINT NOT NULL,
    "targetType" TEXT NOT NULL,
    "label" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "error" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "broadcastRecipient_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "broadcastRecipient_broadcastId_status_idx" ON "broadcastRecipient"("broadcastId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "broadcastRecipient_broadcastId_targetId_key" ON "broadcastRecipient"("broadcastId", "targetId");

-- AddForeignKey
ALTER TABLE "broadcastRecipient" ADD CONSTRAINT "broadcastRecipient_broadcastId_fkey" FOREIGN KEY ("broadcastId") REFERENCES "broadcast"("id") ON DELETE CASCADE ON UPDATE CASCADE;
