-- Invariant de base : une seule réservation vivante par salle et par date.
--
-- C'est ce qui rend la protection contre les demandes concurrentes réelle
-- plutôt que déclarative. Deux requêtes qui passent le même contrôle applicatif
-- au même instant sont départagées ici : la seconde échoue en 23505, et
-- l'action serveur la traduit en refus métier.
--
-- Index *partiel* : seuls les statuts qui occupent la date entrent dans
-- l'unicité. Une réservation annulée, expirée ou clôturée en sort — c'est ce
-- qui permet à la date d'être redemandée sans toucher à l'historique.
--
-- Prisma ne sait pas décrire un index partiel : il vit donc uniquement ici.
-- Vérifié : `prisma migrate diff` ne le voit pas et ne cherche pas à le
-- supprimer, l'index survit aux migrations suivantes.
--
-- `EN_ATTENTE` y figure sans condition d'échéance : un prédicat d'index doit
-- être immuable, `now()` ne l'est pas. C'est la transaction de création qui
-- bascule d'abord les blocages échus en `EXPIREE`, les sortant de l'index,
-- avant de tenter son insertion.
CREATE UNIQUE INDEX "bookings_active_slot_key"
    ON "bookings"("roomId", "eventDate")
 WHERE "status" IN ('EN_ATTENTE', 'EN_COURS_VERIFICATION', 'CONFIRMEE');
