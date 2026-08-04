-- CreateTable
CREATE TABLE "room_categories" (
    "roomId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,

    CONSTRAINT "room_categories_pkey" PRIMARY KEY ("roomId","categoryId")
);

-- CreateIndex
CREATE INDEX "room_categories_categoryId_idx" ON "room_categories"("categoryId");

-- AddForeignKey
ALTER TABLE "room_categories" ADD CONSTRAINT "room_categories_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_categories" ADD CONSTRAINT "room_categories_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Reprise des données : la catégorie principale de chaque salle existante devient
-- son premier rattachement, afin que l'invariant « categoryId ∈ room_categories »
-- soit vrai dès la migration et que les filtres continuent de trouver les salles.
INSERT INTO "room_categories" ("roomId", "categoryId")
SELECT "id", "categoryId" FROM "rooms"
ON CONFLICT DO NOTHING;
