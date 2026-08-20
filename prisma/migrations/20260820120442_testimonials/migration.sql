-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'TESTIMONIAL_SAVED';
ALTER TYPE "AuditAction" ADD VALUE 'TESTIMONIAL_PUBLISHED';
ALTER TYPE "AuditAction" ADD VALUE 'TESTIMONIAL_UNPUBLISHED';

-- CreateTable
CREATE TABLE "testimonials" (
    "id" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "quote" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "testimonials_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "testimonials_publishedAt_position_idx" ON "testimonials"("publishedAt", "position");

-- Reprise des trois témoignages qui vivaient en dur dans `lib/home/content.ts`.
-- Sans cela, la section « Ils ont réservé avec LIUDOR » disparaîtrait de
-- l'accueil entre cette migration et la première saisie en administration.
-- Ils sont insérés publiés, dans l'ordre où ils étaient affichés.
INSERT INTO "testimonials" ("id", "authorName", "role", "rating", "quote", "position", "publishedAt", "createdAt", "updatedAt")
VALUES
  ('temoignage-amina', 'Amina Belkacem', 'Mariage · Alger', 5,
   'Nous avons trouvé et réservé notre salle en une soirée. Les photos correspondaient exactement à la réalité, aucune mauvaise surprise le jour J.',
   1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('temoignage-karim', 'Karim Haddad', 'Séminaire · Oran', 5,
   'L''équipe a vérifié le paiement et confirmé la réservation en quelques heures. Un vrai gain de temps pour organiser notre séminaire annuel.',
   2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('temoignage-lynda', 'Lynda Meziane', 'Anniversaire · Constantine', 4,
   'Les avis des autres clients m''ont vraiment aidée à choisir. La salle était conforme et le propriétaire très réactif sur la plateforme.',
   3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
