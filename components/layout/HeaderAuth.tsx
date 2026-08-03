"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { homePathForRole } from "@/lib/roles";

/** Actions du header public : connexion/inscription ou accès à l'espace. */
export function HeaderAuth() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return <div className="h-8 w-40 animate-pulse rounded-md bg-gray-100" />;
  }

  if (session) {
    return (
      <div className="flex items-center gap-2">
        <Link href={homePathForRole(session.user.role)}>
          <Button variant="ghost" size="sm">
            Mon espace
          </Button>
        </Link>
        <Button
          variant="outline"
          size="sm"
          onClick={() => signOut({ callbackUrl: "/" })}
        >
          <LogOut className="h-4 w-4" />
          Déconnexion
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Link href="/connexion">
        <Button variant="ghost" size="sm">
          Connexion
        </Button>
      </Link>
      <Link href="/inscription">
        <Button size="sm">Inscription</Button>
      </Link>
    </div>
  );
}
