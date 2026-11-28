-- CreateEnum
CREATE TYPE "ChatStatus" AS ENUM ('AI', 'WAITING', 'STAFF', 'CLOSED');

-- CreateEnum
CREATE TYPE "ChatRole" AS ENUM ('VISITOR', 'AI', 'STAFF', 'SYSTEM');

-- CreateTable
CREATE TABLE "ChatConversation" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "memberId" TEXT,
    "locale" TEXT NOT NULL DEFAULT 'en',
    "status" "ChatStatus" NOT NULL DEFAULT 'AI',
    "visitorName" TEXT,
    "visitorPhone" TEXT,
    "startPath" TEXT,
    "aiTurns" INTEGER NOT NULL DEFAULT 0,
    "unreadByStaff" BOOLEAN NOT NULL DEFAULT false,
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" "ChatRole" NOT NULL,
    "text" TEXT NOT NULL,
    "staffName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ChatConversation_tokenHash_key" ON "ChatConversation"("tokenHash");

-- CreateIndex
CREATE INDEX "ChatConversation_status_lastMessageAt_idx" ON "ChatConversation"("status", "lastMessageAt" DESC);

-- CreateIndex
CREATE INDEX "ChatConversation_lastMessageAt_idx" ON "ChatConversation"("lastMessageAt" DESC);

-- CreateIndex
CREATE INDEX "ChatMessage_conversationId_createdAt_idx" ON "ChatMessage"("conversationId", "createdAt");

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "ChatConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

