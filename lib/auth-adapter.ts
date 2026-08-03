import { PrismaAdapter } from "@next-auth/prisma-adapter";
import type { Adapter, AdapterUser } from "next-auth/adapters";
import type { User } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Le modèle User de LIUDOR nomme ses champs `fullName` / `avatarUrl` là où
 * Auth.js attend `name` / `image`. On enveloppe donc l'adapter Prisma pour
 * traduire les méthodes qui manipulent l'utilisateur.
 *
 * Avec le seul Credentials provider (session JWT) l'adapter n'est pas sollicité :
 * il est branché pour qu'un provider OAuth fonctionne sans autre changement.
 */
function toAdapterUser(user: User): AdapterUser {
  return {
    id: user.id,
    email: user.email,
    emailVerified: user.emailVerified,
    name: user.fullName,
    image: user.avatarUrl,
    role: user.role,
  };
}

export function luidorPrismaAdapter(): Adapter {
  const base = PrismaAdapter(prisma);

  return {
    ...base,

    // Type explicite : `Adapter["createUser"]` est une union de signatures,
    // TypeScript n'infère donc pas le paramètre.
    createUser: async ({
      name,
      email,
      emailVerified,
      image,
      role,
    }: Omit<AdapterUser, "id">) => {
      const user = await prisma.user.create({
        data: {
          email,
          emailVerified: emailVerified ?? null,
          fullName: name ?? email,
          avatarUrl: image ?? null,
          // Un provider externe ne fournit pas de rôle : CLIENT par défaut.
          role: role ?? "CLIENT",
        },
      });
      return toAdapterUser(user);
    },

    getUser: async (id) => {
      const user = await prisma.user.findUnique({ where: { id } });
      return user ? toAdapterUser(user) : null;
    },

    getUserByEmail: async (email) => {
      const user = await prisma.user.findUnique({ where: { email } });
      return user ? toAdapterUser(user) : null;
    },

    getUserByAccount: async ({ provider, providerAccountId }) => {
      const account = await prisma.account.findUnique({
        where: { provider_providerAccountId: { provider, providerAccountId } },
        include: { user: true },
      });
      return account ? toAdapterUser(account.user) : null;
    },

    updateUser: async ({ id, name, email, emailVerified, image }) => {
      const user = await prisma.user.update({
        where: { id },
        data: {
          ...(email !== undefined && { email }),
          ...(emailVerified !== undefined && { emailVerified }),
          ...(name !== undefined && { fullName: name ?? undefined }),
          ...(image !== undefined && { avatarUrl: image }),
        },
      });
      return toAdapterUser(user);
    },
  };
}
