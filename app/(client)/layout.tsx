import Link from "next/link";
import { User, CalendarClock, Heart, Clock3 } from "lucide-react";
import { SidebarAccount } from "@/components/layout/SidebarAccount";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/profil", label: "Profil", icon: User },
  { href: "/reservations", label: "Réservations", icon: CalendarClock },
  { href: "/favoris", label: "Favoris", icon: Heart },
  { href: "/historique", label: "Historique", icon: Clock3 },
];

export default function ClientLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="mx-auto flex min-h-screen-safe max-w-7xl gap-8 px-4 py-8 sm:px-6">
      <aside className="hidden w-56 shrink-0 md:block">
        <div className="sticky top-8 flex flex-col gap-3">
          {/*
            Le compte en tête de colonne : l'espace client n'a pas le header
            public, l'avatar y est le seul accès au profil et à la déconnexion.
          */}
          <SidebarAccount
            placement="bottom"
            className="border-b border-gray-200 pb-3"
          />

          <nav className="flex flex-col gap-1">
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
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        {/*
          Sur mobile la colonne est masquée : les mêmes accès sont repris ici,
          navigation défilant horizontalement et avatar à droite.
        */}
        <div className="mb-6 flex items-center gap-3 border-b border-gray-200 pb-3 md:hidden">
          <nav
            aria-label="Navigation du compte"
            className="-mx-1 flex flex-1 gap-1 overflow-x-auto px-1"
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
          <SidebarAccount placement="bottom" showDetails={false} />
        </div>

        {children}
      </div>
    </div>
  );
}
