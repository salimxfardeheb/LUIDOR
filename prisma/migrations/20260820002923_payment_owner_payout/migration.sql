-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'PAYMENT_PAID_OUT';

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "payoutAmount" DECIMAL(10,2),
ADD COLUMN     "payoutAt" TIMESTAMP(3),
ADD COLUMN     "payoutRecordedBy" TEXT;

-- CreateIndex
CREATE INDEX "payments_payoutAt_idx" ON "payments"("payoutAt");

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_payoutRecordedBy_fkey" FOREIGN KEY ("payoutRecordedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
