"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { isDemoVisible } from "@/lib/demo";
import type { Role } from "@/lib/roles";

interface FooterLink {
  href: string;
  label: string;
  /** Rôle exigé pour voir le lien ; absent = visible par tout le monde. */
  role?: Role;
}

interface FooterColumn {
  title: string;
  links: readonly FooterLink[];
}

const LINK_COLUMNS: readonly FooterColumn[] = [
  {
    title: "Découvrir",
    links: [
      { href: "/salles", label: "Toutes les salles" },
      { href: "/salles?categorie=mariage", label: "Salles de mariage" },
      // Le catalogue ne filtre que par catégorie : une ville passe par la page
      // de résultats, qui sait traiter le paramètre `ville`.
      { href: "/salles/resultats?ville=Alger", label: "Salles à Alger" },
      { href: "/blog", label: "Blog & conseils" },
    ],
  },
  {
    // Les trois espaces propriétaire ne sont montrés qu'aux comptes OWNER : ces
    // routes sont de toute façon refusées aux autres rôles par le middleware.
    // « Comment ça marche » reste public, c'est la porte d'entrée des futurs
    // propriétaires.
    title: "Propriétaires",
    links: [
      {
        href: "/owner/salles/nouvelle",
        label: "Publier une salle",
        role: "OWNER",
      },
      { href: "/owner/dashboard", label: "Espace propriétaire", role: "OWNER" },
      {
        href: "/owner/disponibilites",
        label: "Gérer mes disponibilités",
        role: "OWNER",
      },
      { href: "/a-propos", label: "Comment ça marche" },
    ],
  },
  {
    title: "LIUDOR",
    links: [
      { href: "/a-propos", label: "À propos" },
      { href: "/contact", label: "Nous contacter" },
      { href: "/connexion", label: "Se connecter" },
      { href: "/inscription", label: "Créer un compte" },
    ],
  },
] as const;

/**
 * Colonnes de liens du pied de page.
 *
 * Composant client isolé : seul ce bloc a besoin de la session, le reste du
 * footer reste rendu sur le serveur. Comme dans l'en-tête, un lien restreint
 * est masqué tant que le rôle n'est pas connu — un visiteur ne le voit donc
 * jamais apparaître. Un lien vers une zone coupée en mode démo l'est aussi.
 * Une colonne dont tous les liens sont masqués disparaît.
 */
export function FooterLinks() {
  const { data: session } = useSession();
  const role = session?.user?.role;

  return (
    <>
      {LINK_COLUMNS.map((column) => {
        const links = column.links.filter(
          (link) =>
            (!link.role || link.role === role) && isDemoVisible(link.href)
        );

        if (links.length === 0) return null;

        return (
          <nav key={column.title} aria-label={column.title}>
            <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-secondary-400">
              {column.title}
            </h2>
            <ul className="mt-4 space-y-2.5">
              {links.map((link) => (
                <li key={link.href + link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-gray-400 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-primary-900"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        );
      })}
    </>
  );
}
