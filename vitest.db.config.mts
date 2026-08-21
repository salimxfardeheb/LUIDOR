import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * Suite d'intégration : elle parle à PostgreSQL.
 *
 * Configuration séparée plutôt qu'un filtre en ligne de commande, pour deux
 * raisons. La première tient à Vitest 4, qui n'accepte plus `--include`. La
 * seconde compte davantage : ces tests prennent et relâchent des verrous sur
 * une vraie base, et `singleFork` garantit qu'aucun autre fichier ne s'exécute
 * en parallèle et ne vienne disputer les mêmes lignes.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["lib/**/*.db.test.ts", "actions/**/*.db.test.ts"],
    // Les transactions concurrentes sont *dans* les tests, pas entre eux.
    pool: "forks",
    maxWorkers: 1,
    fileParallelism: false,
    // Un aller-retour vers Neon coûte plus cher qu'un test unitaire.
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
});
