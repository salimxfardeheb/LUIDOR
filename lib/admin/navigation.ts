import {
  BadgeCheck,
  CalendarDays,
  CalendarX2,
  ClipboardList,
  LayoutDashboard,
  LayoutGrid,
  MessageSquareQuote,
  Settings,
  ShieldCheck,
  Store,
  Tags,
  type LucideIcon,
} from "lucide-react";

/**
 * Plan de navigation de l'administration.
 *
 * Déclaré à part de la colonne : les libellés servent aussi au fil d'Ariane et
 * aux titres de page, et une entrée ajoutée ici apparaît partout d'un coup.
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
    title: "Gestion de la plateforme",
    items: [
      { href: "/admin/salles", label: "Salles", icon: LayoutGrid },
      { href: "/admin/categories", label: "Catégories de salles", icon: Tags },
      {
        href: "/admin/demandes",
        label: "Demandes d'inscription",
        icon: ClipboardList,
      },
      {
        href: "/admin/verification",
        label: "Vérification des salles",
        icon: BadgeCheck,
      },
    ],
  },
  {
    title: "Réservations",
    items: [
      {
        href: "/admin/reservations",
        label: "Toutes les réservations",
        icon: Store,
      },
      {
        href: "/admin/calendrier",
        label: "Calendrier global",
        icon: CalendarDays,
      },
      { href: "/admin/annulations", label: "Annulations", icon: CalendarX2 },
      {
        href: "/admin/avis",
        label: "Avis & Commentaires",
        icon: MessageSquareQuote,
      },
    ],
  },
  {
    title: "Paramètres",
    items: [
      {
        href: "/admin/parametres",
        label: "Paramètres généraux",
        icon: Settings,
      },
      { href: "/admin/securite", label: "Sécurité & Logs", icon: ShieldCheck },
    ],
  },
];

/**
 * Entrée correspondant au chemin courant.
 *
 * Comparaison par préfixe pour qu'une sous-page (`/admin/salles/<id>`) garde sa
 * section en surbrillance, mais la correspondance exacte l'emporte : sans cela
 * `/admin/salles` resterait actif sur toute page commençant par le même début.
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
