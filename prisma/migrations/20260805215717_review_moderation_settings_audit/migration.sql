-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('SIGN_IN', 'ROOM_APPROVED', 'ROOM_REJECTED', 'USER_SUSPENDED', 'USER_REACTIVATED', 'BOOKING_CONFIRMED', 'BOOKING_CANCELLED', 'PAYMENT_RECORDED', 'REVIEW_PUBLISHED', 'REVIEW_DELETED', 'POST_PUBLISHED', 'POST_UNPUBLISHED', 'POST_SAVED', 'CATALOG_UPDATED', 'SETTINGS_UPDATED', 'PASSWORD_CHANGED');

-- AlterTable
ALTER TABLE "reviews" ADD COLUMN     "publishedAt" TIMESTAMP(3);

-- Les avis déjà en base étaient visibles publiquement avant l'arrivée de la
-- modération : les laisser à `NULL` les retirerait des fiches salle et
-- fausserait toutes les notes moyennes. Ils sont donc considérés publiés à
-- leur date de dépôt.
UPDATE "reviews" SET "publishedAt" = "createdAt" WHERE "publishedAt" IS NULL;

-- CreateTable
CREATE TABLE "platform_settings" (
    "id" TEXT NOT NULL DEFAULT 'platform',
    "siteName" TEXT NOT NULL DEFAULT 'LIUDOR',
    "tagline" TEXT NOT NULL DEFAULT 'Lieux d''Or',
    "contactEmail" TEXT NOT NULL DEFAULT 'contact@liudor.dz',
    "contactPhone" TEXT,
    "address" TEXT,
    "bookingLeadTimeDays" INTEGER NOT NULL DEFAULT 2,
    "reviewAutoPublish" BOOLEAN NOT NULL DEFAULT true,
    "maintenanceMode" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" "AuditAction" NOT NULL,
    "target" TEXT,
    "detail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Ligne unique des réglages : la lire ne doit jamais renvoyer « rien », sans
-- quoi chaque page devrait gérer l'absence de configuration.
INSERT INTO "platform_settings" ("id", "updatedAt") VALUES ('platform', CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
