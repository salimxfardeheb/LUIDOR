import {
  BadgeCheck,
  Banknote,
  CalendarRange,
  LayoutDashboard,
  MessageSquareQuote,
  PenLine,
  Store,
  UserRound,
  type LucideIcon,
} from "lucide-react";

/**
 * Plan de navigation de l'administration.
 *
 * Déclaré à part de la colonne : les libellés servent aussi au fil d'Ariane et
 * aux titres de page, et une entrée ajoutée ici apparaît partout d'un coup.
 *
 * Le plan suit le travail réel de l'équipe : qui est inscrit, quelles salles
 * attendent d'être validées, quelles réservations sont en cours, où en est
 * l'argent, et ce qui se publie sur le blog. Une section n'existe que si elle
 * a un écran derrière — pas de page d'attente dans le menu.
 */

export interface AdminNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export interface AdminNavGroup {
  /** Intitulé du groupe, affiché en petites majuscules espacées. */
  title: string;
  items: AdminNavItem[];
}

export const ADMIN_NAV: AdminNavGroup[] = [
  {
    title: "Tableau de bord",
    items: [
      {
        href: "/admin/dashboard",
        label: "Tableau de bord",
        icon: LayoutDashboard,
      },
    ],
  },
  {
    // Clients et propriétaires sont les mêmes comptes en base, mais deux
    // métiers différents à l'écran : on ne regarde pas un client comme on
    // regarde quelqu'un qui met une salle en ligne.
    title: "Gestion des utilisateurs",
    items: [
      { href: "/admin/clients", label: "Clients", icon: UserRound },
      { href: "/admin/proprietaires", label: "Propriétaires", icon: Store },
    ],
  },
  {
    title: "Exploitation",
    items: [
      {
        href: "/admin/salles",
        label: "Validation des salles",
        icon: BadgeCheck,
      },
      {
        href: "/admin/reservations",
        label: "Réservations",
        icon: CalendarRange,
      },
      { href: "/admin/paiements", label: "Paiements", icon: Banknote },
    ],
  },
  {
    title: "Contenu",
    items: [
      { href: "/admin/blog", label: "Blog", icon: PenLine },
      {
        href: "/admin/temoignages",
        label: "Témoignages",
        icon: MessageSquareQuote,
      },
    ],
  },
];

/**
 * Entrée correspondant au chemin courant.
 *
 * Comparaison par préfixe pour qu'une sous-page (`/admin/reservations/<id>`)
 * garde sa section en surbrillance, mais la correspondance exacte l'emporte :
 * sans cela `/admin/salles` resterait actif sur toute page commençant par le
 * même début.
 */
export function activeAdminHref(pathname: string): string | null {
  const items = ADMIN_NAV.flatMap((group) => group.items);

  const exact = items.find((item) => item.href === pathname);
  if (exact) return exact.href;

  const prefixed = items
    .filter((item) => pathname.startsWith(`${item.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0];

  return prefixed?.href ?? null;
}
