-- AlterTable
ALTER TABLE "reviews" ADD COLUMN     "photoUrl" TEXT;

-- AlterTable
ALTER TABLE "rooms" ADD COLUMN     "cancellationPolicy" TEXT,
ADD COLUMN     "cancellationTerms" TEXT,
ADD COLUMN     "cleaningFee" DECIMAL(10,2),
ADD COLUMN     "depositAmount" DECIMAL(10,2),
ADD COLUMN     "district" TEXT,
ADD COLUMN     "hasAccommodation" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hasParking" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "musicPolicy" TEXT,
ADD COLUMN     "openingHours" TEXT,
ADD COLUMN     "petsAllowed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "spacesCount" INTEGER,
ADD COLUMN     "surfaceM2" INTEGER,
ADD COLUMN     "verifiedAt" TIMESTAMP(3),
ADD COLUMN     "videoUrl" TEXT,
ADD COLUMN     "wheelchairAccess" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "languages" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "responseTimeHours" INTEGER;
