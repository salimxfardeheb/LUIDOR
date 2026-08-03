import type { UserRole } from "@prisma/client";
import type { DefaultSession } from "next-auth";

/**
 * Ajoute l'id et le rôle LIUDOR au token JWT et à la session, afin que
 * `session.user.role` soit typé côté serveur comme côté client.
 */
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
    } & DefaultSession["user"];
  }

  interface User {
    role: UserRole;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: UserRole;
  }
}
