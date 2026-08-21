-- Blocage temporaire d'une date par une demande en attente.
--
-- Avant cette migration, deux clients pouvaient déposer une demande sur la même
-- salle et la même date : `EN_ATTENTE` n'occupait la date dans aucun des
-- chemins de création. Trois choses changent ici — un statut pour les demandes
-- jamais reprises, une échéance de blocage, et un invariant de base.

-- 1. Statut d'une demande dont le blocage a expiré. Distinct d'`ANNULEE`, qui
--    est une décision prise par quelqu'un.
ALTER TYPE "BookingStatus" ADD VALUE 'EXPIREE' BEFORE 'CLOTUREE';

-- 2. Échéance du blocage. Nullable : seules les demandes `EN_ATTENTE` en
--    portent une, les autres statuts ne s'éteignent pas tout seuls.
ALTER TABLE "bookings" ADD COLUMN "expiresAt" TIMESTAMP(3);

-- 3. Durée du blocage, réglable en base sans redéploiement. La valeur par
--    défaut double le délai de réponse annoncé au client (24 h ouvrées).
ALTER TABLE "platform_settings"
  ADD COLUMN "pendingHoldHours" INTEGER NOT NULL DEFAULT 48;

-- 4. Reprise de l'existant : une demande en attente déjà déposée reçoit
--    l'échéance qu'elle aurait eue. Sans cela elle serait lue comme un blocage
--    sans échéance, donc éternel. Aucune ligne n'est supprimée ni requalifiée.
UPDATE "bookings"
   SET "expiresAt" = "createdAt" + interval '48 hours'
 WHERE "status" = 'EN_ATTENTE'
   AND "expiresAt" IS NULL;

-- 5. Index du chemin critique : la recherche du conflit sur une salle et une
--    date est faite à chaque vérification et à chaque dépôt de demande.
CREATE INDEX "bookings_roomId_eventDate_idx" ON "bookings"("roomId", "eventDate");
