import Link from "next/link";
import { CalendarDays, LayoutDashboard, LayoutGrid, LifeBuoy } from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/ui/Logo";
import { BackToSiteLink } from "@/components/layout/BackToSiteLink";
import { SidebarAccount } from "@/components/layout/SidebarAccount";

// Aucune réservation ne se prend en ligne : le portail propriétaire sert à
// publier des salles et à tenir leurs disponibilités à jour, les demandes
// arrivent ensuite par le formulaire de contact de la fiche salle.
const navItems = [
  { href: "/owner/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/owner/salles", label: "Salles", icon: LayoutGrid },
  { href: "/owner/disponibilites", label: "Disponibilités", icon: CalendarDays },
];

export default function OwnerLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-screen-safe">
      {/*
        `sticky` + hauteur d'écran : la colonne garde la taille du viewport et
        reste en place quand le contenu défile. `overflow-y-auto` lui donne son
        propre défilement si la navigation dépasse la hauteur disponible.
      */}
      <aside className="sticky top-0 hidden h-screen-safe w-60 shrink-0 flex-col overflow-y-auto border-r border-gray-200 bg-white p-4 md:flex">
        <Link href="/" aria-label="Accueil LIUDOR" className="mb-6 block px-3">
          <Logo size="sm" />
        </Link>
        <span className="mb-6 block px-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
          Espace propriétaire
        </span>
        {/* `flex-1` : la navigation prend la place restante, ce qui range le
            reste de la colonne en bas — même agencement que la colonne
            d'administration. */}
        <nav className="flex flex-1 flex-col gap-1">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium",
                "text-gray-700 transition-colors hover:bg-gray-100 hover:text-primary-900"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>

        {/*
          Pied de colonne : l'aide, puis la sortie vers le site et le compte
          sous un seul filet. Le portail propriétaire n'a pas le header public —
          l'avatar en bas de colonne est son accès au profil et à la
          déconnexion.
        */}
        <SidebarHelpCard />

        <div className="mt-3 flex flex-col gap-1 border-t border-gray-200 pt-3">
          <BackToSiteLink />
          <SidebarAccount />
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        {/*
          Barre mobile : la colonne est masquée, le logo y reprend son rôle de
          retour à l'accueil.
        */}
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-2 md:hidden">
          <Link href="/" aria-label="Accueil LIUDOR">
            <Logo size="sm" />
          </Link>
          <SidebarAccount placement="bottom" showDetails={false} />
        </div>
        <div className="p-6 md:p-10">{children}</div>
      </div>
    </div>
  );
}

/**
 * Bloc d'aide en pied de colonne : la sortie vers le support humain.
 *
 * Il vit ici et pas dans l'administration : un propriétaire est seul devant un
 * dossier refusé ou un calendrier à tenir, alors que l'équipe LIUDOR *est* le
 * support — lui proposer de se contacter elle-même n'avait pas de sens.
 */
function SidebarHelpCard() {
  return (
    <div className="mt-6 rounded-lg border border-gray-200 bg-gray-50 p-4">
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-white">
        <LifeBuoy aria-hidden className="h-5 w-5" />
      </span>
      <p className="mt-3 text-sm font-semibold text-gray-900">
        Besoin d&apos;aide ?
      </p>
      <p className="mt-1 text-xs leading-relaxed text-gray-500">
        Une question sur la validation d&apos;une salle ou sur vos
        disponibilités ? L&apos;équipe LIUDOR vous répond.
      </p>
      <Link
        href="/contact"
        className="mt-3 inline-flex w-full items-center justify-center rounded-md bg-secondary px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-secondary-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2"
      >
        Contacter le support
      </Link>
    </div>
  );
}
