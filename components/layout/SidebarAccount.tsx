"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { LogIn } from "lucide-react";
import { UserMenu } from "@/components/layout/UserMenu";
import { SIGN_IN_PATH } from "@/lib/roles";
import { cn } from "@/lib/utils";

/**
 * Bloc compte des barres latérales (client, propriétaire, administration).
 *
 * Ces espaces n'ont pas le header public : sans ce bloc, un propriétaire ou un
 * administrateur n'aurait aucun accès à son profil ni à la déconnexion depuis
 * son portail. Le menu est le même que dans le header — un seul endroit à faire
 * évoluer.
 */
export function SidebarAccount({
  onDark = false,
  placement = "top",
  showDetails = true,
  className,
}: {
  onDark?: boolean;
  placement?: "bottom" | "top";
  /** `false` ne garde que l'avatar : barre compacte du mobile. */
  showDetails?: boolean;
  className?: string;
}) {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div
        role="status"
        aria-label="Chargement de la session"
        className={cn(
          "h-14 animate-pulse rounded-md",
          onDark ? "bg-white/10" : "bg-gray-100",
          className
        )}
      />
    );
  }

  if (!session?.user) {
    return (
      <Link
        href={SIGN_IN_PATH}
        className={cn(
          "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
          onDark
            ? "text-gray-200 hover:bg-white/10 hover:text-white"
            : "text-gray-700 hover:bg-gray-100 hover:text-primary-900",
          className
        )}
      >
        <LogIn aria-hidden className="h-4 w-4" />
        Se connecter
      </Link>
    );
  }

  return (
    <div className={className}>
      <UserMenu
        name={session.user.name ?? "Mon compte"}
        email={session.user.email ?? ""}
        avatarUrl={session.user.image ?? null}
        role={session.user.role}
        onDark={onDark}
        showDetails={showDetails}
        placement={placement}
      />
    </div>
  );
}
