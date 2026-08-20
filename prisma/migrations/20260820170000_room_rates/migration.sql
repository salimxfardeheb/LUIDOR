-- CreateEnum
CREATE TYPE "RateUnit" AS ENUM ('FORFAIT', 'COUVERT', 'PERSONNE', 'HEURE');

-- CreateTable
CREATE TABLE "room_rates" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "detail" TEXT,
    "price" DECIMAL(10,2) NOT NULL,
    "unit" "RateUnit" NOT NULL DEFAULT 'FORFAIT',
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "room_rates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "room_rates_roomId_idx" ON "room_rates"("roomId");

-- AddForeignKey
ALTER TABLE "room_rates" ADD CONSTRAINT "room_rates_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
