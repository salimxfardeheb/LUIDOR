-- CreateEnum
CREATE TYPE "ModerationAction" AS ENUM ('APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "suspendedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "room_moderations" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "adminId" TEXT,
    "action" "ModerationAction" NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "room_moderations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "room_moderations_roomId_idx" ON "room_moderations"("roomId");

-- CreateIndex
CREATE INDEX "room_moderations_createdAt_idx" ON "room_moderations"("createdAt");

-- CreateIndex
CREATE INDEX "rooms_status_idx" ON "rooms"("status");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- AddForeignKey
ALTER TABLE "room_moderations" ADD CONSTRAINT "room_moderations_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_moderations" ADD CONSTRAINT "room_moderations_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
