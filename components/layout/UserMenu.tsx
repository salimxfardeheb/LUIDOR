"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  CalendarClock,
  ChevronDown,
  Clock3,
  Heart,
  LayoutGrid,
  LogOut,
  ShieldCheck,
  User,
  type LucideIcon,
} from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { homePathForRole, ROLE_LABELS, type Role } from "@/lib/roles";
import { cn } from "@/lib/utils";

interface MenuLink {
  href: string;
  label: string;
  icon: LucideIcon;
}

/** Espace compte, commun aux trois rôles. */
const ACCOUNT_LINKS: readonly MenuLink[] = [
  { href: "/profil", label: "Mon profil", icon: User },
  { href: "/reservations", label: "Mes réservations", icon: CalendarClock },
  { href: "/favoris", label: "Mes favoris", icon: Heart },
  { href: "/historique", label: "Historique", icon: Clock3 },
] as const;

/**
 * Entrée vers le portail propre au rôle. `null` pour un client : son espace
 * *est* l'espace compte, déjà listé ci-dessus.
 */
const ROLE_SPACE: Record<Role, Omit<MenuLink, "href"> | null> = {
  CLIENT: null,
  OWNER: { label: "Espace propriétaire", icon: LayoutGrid },
  ADMIN: { label: "Administration", icon: ShieldCheck },
};

/**
 * Menu du compte connecté, ouvert depuis l'avatar.
 *
 * Un seul composant pour les trois rôles : l'avatar prend la couleur du rôle,
 * et seule l'entrée vers le portail (propriétaire, administration) change. Les
 * liens du compte, eux, sont identiques pour tout le monde.
 */
export function UserMenu({
  name,
  email,
  avatarUrl,
  role,
  onDark = false,
  showDetails = false,
  placement = "bottom",
}: {
  name: string;
  email: string;
  avatarUrl: string | null;
  role: Role;
  /** Menu posé sur un fond marine (header, sidebar admin) : variantes claires. */
  onDark?: boolean;
  /** Affiche le nom et le rôle à côté de l'avatar : utile en barre latérale. */
  showDetails?: boolean;
  /** `top` ouvre le menu vers le haut, pour un déclencheur en pied de colonne. */
  placement?: "bottom" | "top";
}) {
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  // Referme à la navigation : le menu ne doit pas survivre au changement de page.
  React.useEffect(() => setOpen(false), [pathname]);

  React.useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const roleSpace = ROLE_SPACE[role];
  const roleLabel = ROLE_LABELS[role].label;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Compte de ${name} — ouvrir le menu`}
        className={cn(
          "flex items-center gap-2 transition-colors focus-visible:outline-none focus-visible:ring-2",
          showDetails ? "w-full rounded-md p-2" : "rounded-full p-0.5",
          onDark
            ? "hover:bg-white/10 focus-visible:ring-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-primary-900"
            : "hover:bg-gray-100 focus-visible:ring-accent/60"
        )}
      >
        <Avatar
          name={name}
          src={avatarUrl}
          role={role}
          size="sm"
          className={cn("ring-2", onDark ? "ring-white/30" : "ring-gray-200")}
        />

        {showDetails && (
          <span className="min-w-0 flex-1 text-left">
            <span
              className={cn(
                "block truncate text-sm font-medium",
                onDark ? "text-white" : "text-gray-900"
              )}
            >
              {name}
            </span>
            <span
              className={cn(
                "block truncate text-xs",
                onDark ? "text-gray-300" : "text-gray-500"
              )}
            >
              {ROLE_LABELS[role].label}
            </span>
          </span>
        )}

        <ChevronDown
          aria-hidden
          className={cn(
            "h-4 w-4 shrink-0 transition-transform",
            showDetails ? "" : "mr-1",
            onDark ? "text-gray-200" : "text-gray-500",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Menu du compte"
          className={cn(
            "absolute z-50 w-64 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg",
            placement === "top"
              ? "bottom-full left-0 mb-2"
              : "right-0 top-full mt-2"
          )}
        >
          <div className="flex items-center gap-3 border-b border-gray-100 p-4">
            <Avatar name={name} src={avatarUrl} role={role} size="sm" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-gray-900">
                {name}
              </p>
              <p className="truncate text-xs text-gray-500">{email}</p>
            </div>
          </div>

          <div className="border-b border-gray-100 px-4 py-2">
            <Badge variant="info">
              <ShieldCheck aria-hidden className="h-3.5 w-3.5" />
              {roleLabel}
            </Badge>
          </div>

          <ul className="py-1">
            {roleSpace && (
              <li>
                <MenuItem
                  href={homePathForRole(role)}
                  label={roleSpace.label}
                  icon={roleSpace.icon}
                  highlighted
                />
              </li>
            )}

            {ACCOUNT_LINKS.map((link) => (
              <li key={link.href}>
                <MenuItem
                  href={link.href}
                  label={link.label}
                  icon={link.icon}
                  current={pathname === link.href}
                />
              </li>
            ))}
          </ul>

          <div className="border-t border-gray-100 py-1">
            <button
              type="button"
              role="menuitem"
              onClick={() => signOut({ callbackUrl: "/" })}
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-error transition-colors hover:bg-error/5 focus-visible:outline-none focus-visible:bg-error/5"
            >
              <LogOut aria-hidden className="h-4 w-4" />
              Déconnexion
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function MenuItem({
  href,
  label,
  icon: Icon,
  highlighted = false,
  current = false,
}: MenuLink & { highlighted?: boolean; current?: boolean }) {
  return (
    <Link
      href={href}
      role="menuitem"
      aria-current={current ? "page" : undefined}
      className={cn(
        "flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors",
        "focus-visible:outline-none focus-visible:bg-gray-100",
        highlighted
          ? "font-semibold text-primary-900 hover:bg-secondary/10"
          : "font-medium text-gray-700 hover:bg-gray-100",
        current && "bg-gray-50 text-primary-900"
      )}
    >
      <Icon
        aria-hidden
        className={cn("h-4 w-4", highlighted ? "text-secondary" : "text-gray-400")}
      />
      {label}
    </Link>
  );
}
