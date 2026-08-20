-- Retrait de la catégorie « Baptême ».
--
-- Migration de données : le schéma ne change pas, seules les lignes de
-- `categories` et leurs rattachements sont touchés. Elle est nécessaire parce
-- que les catégories proposées au propriétaire (formulaire de publication)
-- viennent de la base, pas de `lib/home/content.ts` : retirer le libellé du
-- code ne suffit pas à le faire disparaître de l'application.

-- Les salles dont « Baptême » était la catégorie principale basculent sur
-- « Réception », la plus proche parmi les catégories restantes. Le rattachement
-- correspondant est créé s'il manque : l'invariant de `room_categories` veut que
-- la catégorie principale d'une salle y figure toujours.
WITH moved AS (
  UPDATE "rooms"
  SET "categoryId" = (SELECT id FROM "categories" WHERE name = 'Réception')
  WHERE "categoryId" = (SELECT id FROM "categories" WHERE name = 'Baptême')
  RETURNING id, "categoryId"
)
INSERT INTO "room_categories" ("roomId", "categoryId")
SELECT id, "categoryId" FROM moved
ON CONFLICT DO NOTHING;

-- Les rattachements secondaires vers « Baptême » partent en cascade avec la
-- catégorie (`room_categories.categoryId` est en ON DELETE CASCADE).
DELETE FROM "categories" WHERE name = 'Baptême';
