"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { UserMenu } from "@/components/layout/UserMenu";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

interface HeaderAuthProps {
  /** Header posé sur le fond marine : bascule les variantes claires. */
  onDark?: boolean;
}

/** Actions du header public : connexion/inscription ou accès à l'espace. */
export function HeaderAuth({ onDark = false }: HeaderAuthProps) {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div
        role="status"
        aria-label="Chargement de la session"
        className={cn(
          "h-9 w-16 animate-pulse rounded-full",
          onDark ? "bg-white/10" : "bg-gray-100"
        )}
      />
    );
  }

  /*
   * Connecté : l'avatar remplace les boutons « Mon espace » et « Déconnexion »,
   * qui deviennent deux entrées du menu. Le nom vient de la session ; il est
   * rafraîchi après une modification du profil (`useSession().update()`), sans
   * quoi l'en-tête afficherait l'ancien nom jusqu'à la prochaine connexion.
   */
  if (session?.user) {
    return (
      <UserMenu
        name={session.user.name ?? "Mon compte"}
        email={session.user.email ?? ""}
        avatarUrl={session.user.image ?? null}
        role={session.user.role}
        onDark={onDark}
      />
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Link href="/connexion">
        <Button variant={onDark ? "outline-light" : "outline"} size="sm">
          Connexion
        </Button>
      </Link>
      <Link href="/inscription">
        <Button size="sm">Inscription</Button>
      </Link>
    </div>
  );
}
