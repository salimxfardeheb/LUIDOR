"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { homePathForRole } from "@/lib/roles";
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
          "h-8 w-40 animate-pulse rounded-md",
          onDark ? "bg-white/10" : "bg-gray-100"
        )}
      />
    );
  }

  const ghostClass = onDark
    ? "text-gray-200 hover:bg-white/10 hover:text-white"
    : undefined;

  if (session) {
    return (
      <div className="flex items-center gap-2">
        <Link href={homePathForRole(session.user.role)}>
          <Button variant="ghost" size="sm" className={ghostClass}>
            Mon espace
          </Button>
        </Link>
        <Button
          variant={onDark ? "outline-light" : "outline"}
          size="sm"
          onClick={() => signOut({ callbackUrl: "/" })}
        >
          <LogOut aria-hidden className="h-4 w-4" />
          Déconnexion
        </Button>
      </div>
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
