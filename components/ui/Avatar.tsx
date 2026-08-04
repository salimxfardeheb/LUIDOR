import Image from "next/image";
import { formatInitials } from "@/lib/format";
import type { Role } from "@/lib/roles";
import { cn } from "@/lib/utils";

const SIZES = {
  sm: { box: "h-9 w-9", text: "text-xs", pixels: 36 },
  md: { box: "h-14 w-14", text: "text-base", pixels: 56 },
  lg: { box: "h-20 w-20 sm:h-24 sm:w-24", text: "text-2xl", pixels: 96 },
} as const;

export type AvatarSize = keyof typeof SIZES;

/**
 * Couleur de repli par rôle : les initiales d'un client, d'un propriétaire et
 * d'un administrateur se distinguent au premier coup d'œil, en restant dans la
 * palette de la charte (marine, or, bleu d'accent).
 */
const ROLE_COLORS: Record<Role, string> = {
  CLIENT: "bg-primary-900 text-white",
  OWNER: "bg-secondary text-primary-900",
  ADMIN: "bg-accent text-white",
};

/**
 * Photo de profil, avec repli sur les initiales.
 *
 * Aucun fichier par défaut à charger : sans avatar, le composant affiche les
 * initiales sur la couleur du rôle, ce qui évite un 404 et garde la mise en
 * page stable pendant le chargement.
 */
export function Avatar({
  name,
  src,
  role = "CLIENT",
  size = "md",
  className,
}: {
  /** Nom complet, source des initiales et du texte alternatif. */
  name: string;
  src?: string | null;
  /** Rôle du compte : détermine la couleur du repli. */
  role?: Role;
  size?: AvatarSize;
  className?: string;
}) {
  const { box, text, pixels } = SIZES[size];

  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold",
        ROLE_COLORS[role],
        box,
        text,
        className
      )}
    >
      {src ? (
        <Image
          src={src}
          alt={`Photo de profil de ${name}`}
          width={pixels}
          height={pixels}
          className="h-full w-full object-cover"
        />
      ) : (
        <span aria-hidden>{formatInitials(name)}</span>
      )}
    </span>
  );
}
