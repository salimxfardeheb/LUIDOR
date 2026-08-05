/**
 * Configuration de l'outillage Prisma (CLI : migrate, generate, studio, seed).
 *
 * Remplace la propriété `package.json#prisma`, dépréciée et supprimée en
 * Prisma 7. Ce fichier ne concerne que la CLI : le client applicatif est
 * construit dans `lib/prisma.ts`.
 *
 * L'URL de connexion n'est volontairement pas déclarée ici. En Prisma 6 elle
 * reste obligatoire dans le bloc `datasource` du schéma (`prisma validate`
 * échoue en P1012 sans elle) ; la déclarer aux deux endroits ferait diverger
 * deux sources de vérité. Elle se déplacera ici le jour de la montée en
 * Prisma 7, qui l'interdit dans le schéma — voir la note en tête de
 * `prisma/schema.prisma`.
 */
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",

  migrations: {
    seed: "tsx prisma/seed/index.ts",
  },
});
