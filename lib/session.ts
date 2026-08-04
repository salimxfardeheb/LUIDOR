import type { Role } from "@/lib/roles";
import { auth } from "@/lib/auth";

/**
 * Garde de session commune à l'espace compte.
 *
 * Les pages `/profil`, `/reservations`, `/favoris` et `/historique` sont
 * ouvertes aux trois rôles : seule l'authentification est exigée. Les actions
 * qui écrivent revérifient malgré tout la session ici — le middleware protège
 * les pages, pas les actions, qui sont des points d'entrée HTTP publics.
 */

export interface SessionUser {
  id: string;
  role: Role;
}

export type SessionResult =
  | { ok: true; user: SessionUser }
  | { ok: false; refusal: { status: 401; message: string } };

export async function requireUserSession(): Promise<SessionResult> {
  const session = await auth();

  if (!session?.user?.id) {
    return {
      ok: false,
      refusal: {
        status: 401,
        message: "Votre session a expiré. Reconnectez-vous pour continuer.",
      },
    };
  }

  return { ok: true, user: { id: session.user.id, role: session.user.role } };
}
