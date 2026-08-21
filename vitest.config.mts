import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * Deux suites, volontairement séparées.
 *
 * `*.test.ts` ne touche rien : ce sont les règles de disponibilité, testées en
 * mémoire. Elles tournent partout, y compris sans base — c'est ce qui permet de
 * les lancer à chaque modification.
 *
 * `*.db.test.ts` parle à PostgreSQL et vérifie ce qu'aucun test en mémoire ne
 * peut prouver : que deux demandes simultanées sont réellement départagées.
 * Elles ne sont incluses que par `npm run test:db`, avec une base accessible.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts", "actions/**/*.test.ts"],
    exclude: ["**/node_modules/**", "**/*.db.test.ts"],
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
});
