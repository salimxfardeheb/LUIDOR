import Link from "next/link";
import { User, CalendarClock, Heart, Clock3 } from "lucide-react";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/profil", label: "Profil", icon: User },
  { href: "/reservations", label: "Réservations", icon: CalendarClock },
  { href: "/favoris", label: "Favoris", icon: Heart },
  { href: "/historique", label: "Historique", icon: Clock3 },
];

const navLinkClass = cn(
  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium",
  "text-gray-700 transition-colors hover:bg-gray-100 hover:text-primary-900"
);

/**
 * L'espace client garde le header et le footer publics : le compte est une
 * étape du parcours de réservation, pas un portail à part. La barre de
 * navigation y assure le retour à l'accueil et vers les salles, et son avatar
 * donne accès au profil et à la déconnexion — d'où l'absence de `SidebarAccount`
 * ici, qui ferait un second menu du compte sur la même page.
 */
export default function ClientLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-screen-safe flex-col bg-white">
      <a
        href="#contenu"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-900 focus:shadow-lg"
      >
        Aller au contenu principal
      </a>
      <SiteHeader />

      <main
        id="contenu"
        className="mx-auto flex w-full max-w-7xl flex-1 gap-8 px-4 py-8 sm:px-6"
      >
        <aside className="hidden w-56 shrink-0 md:block">
          {/* `top-24` : sous le header, lui-même fixé en haut sur 4rem. */}
          <nav
            aria-label="Navigation du compte"
            className="sticky top-24 flex flex-col gap-1"
          >
            {navItems.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href} className={navLinkClass}>
                <Icon aria-hidden className="h-4 w-4" />
                {label}
              </Link>
            ))}
          </nav>
        </aside>

        <div className="min-w-0 flex-1">
          {/* Sur mobile la colonne est masquée : les mêmes liens défilent ici. */}
          <nav
            aria-label="Navigation du compte"
            className="-mx-1 mb-6 flex gap-1 overflow-x-auto border-b border-gray-200 px-1 pb-3 md:hidden"
          >
            {navItems.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 hover:text-primary-900"
              >
                <Icon aria-hidden className="h-4 w-4" />
                {label}
              </Link>
            ))}
          </nav>

          {children}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
