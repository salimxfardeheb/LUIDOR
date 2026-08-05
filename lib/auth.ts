import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { luidorPrismaAdapter } from "@/lib/auth-adapter";
import { SIGN_IN_PATH } from "@/lib/roles";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const authOptions: NextAuthOptions = {
  adapter: luidorPrismaAdapter(),

  // Obligatoire avec le Credentials provider : Auth.js ne persiste pas de
  // session en base pour ce provider, tout passe par un JWT signé.
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },

  pages: {
    signIn: SIGN_IN_PATH,
    error: SIGN_IN_PATH,
  },

  providers: [
    CredentialsProvider({
      name: "Email et mot de passe",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mot de passe", type: "password" },
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email.trim().toLowerCase() },
        });

        // passwordHash null : compte créé via un provider externe.
        if (!user?.passwordHash) return null;

        const passwordMatches = await bcrypt.compare(
          parsed.data.password,
          user.passwordHash
        );
        if (!passwordMatches) return null;

        // Compte suspendu par l'administration : la connexion est refusée tant
        // qu'il n'a pas été réactivé. Le refus est indistinct d'un mot de passe
        // erroné côté formulaire — volontairement : le motif d'une suspension
        // se donne par le support, pas par un écran de connexion.
        if (user.suspendedAt) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.fullName,
          image: user.avatarUrl,
          role: user.role,
        };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user, trigger }) {
      // Connexion : on grave l'id et le rôle dans le token.
      if (user) {
        token.id = user.id;
        token.role = user.role;
        return token;
      }

      // Le rôle est figé dans le JWT jusqu'à son expiration. Un changement de
      // rôle côté admin est répercuté via `useSession().update()`.
      if (trigger === "update" && token.id) {
        const fresh = await prisma.user.findUnique({
          where: { id: token.id },
          select: { role: true, fullName: true, avatarUrl: true },
        });
        if (fresh) {
          token.role = fresh.role;
          token.name = fresh.fullName;
          token.picture = fresh.avatarUrl;
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
      }
      return session;
    },
  },
};

/** Session côté serveur (Server Components, Server Actions, Route Handlers). */
export function auth() {
  return getServerSession(authOptions);
}
