import { Ban, CheckCircle2 } from "lucide-react";
import { Badge, type BadgeProps } from "@/components/ui/Badge";
import { ROLE_LABELS, type Role } from "@/lib/roles";

/**
 * Badges d'un compte : son rôle et son état.
 *
 * Partagés par la liste des utilisateurs et celle des propriétaires — un même
 * compte doit s'y présenter à l'identique.
 */

/** Couleur de chaque rôle, dans la continuité du repli coloré de l'`Avatar`. */
const ROLE_VARIANTS: Record<Role, NonNullable<BadgeProps["variant"]>> = {
  CLIENT: "neutral",
  OWNER: "secondary",
  ADMIN: "primary",
};

export function UserRoleBadge({
  role,
  className,
}: {
  role: Role;
  className?: string;
}) {
  return (
    <Badge variant={ROLE_VARIANTS[role]} className={className}>
      {ROLE_LABELS[role].label}
    </Badge>
  );
}

/**
 * État du compte, dérivé de `suspendedAt` : un compte suspendu ne peut plus se
 * connecter, ce que le badge doit dire sans ambiguïté.
 */
export function AccountStatusBadge({
  suspended,
  className,
}: {
  suspended: boolean;
  className?: string;
}) {
  return (
    <Badge variant={suspended ? "error" : "success"} className={className}>
      {suspended ? (
        <Ban aria-hidden className="h-3 w-3" />
      ) : (
        <CheckCircle2 aria-hidden className="h-3 w-3" />
      )}
      {suspended ? "Suspendu" : "Actif"}
    </Badge>
  );
}
