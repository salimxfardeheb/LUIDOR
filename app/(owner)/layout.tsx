import Link from "next/link";
import {
  LayoutDashboard,
  LayoutGrid,
  CalendarDays,
  CalendarCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/ui/Logo";
import { BackToSiteLink } from "@/components/layout/BackToSiteLink";
import { SidebarAccount } from "@/components/layout/SidebarAccount";

const navItems = [
  { href: "/owner/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/owner/salles", label: "Salles", icon: LayoutGrid },
  { href: "/owner/disponibilites", label: "Disponibilités", icon: CalendarDays },
  { href: "/owner/reservations", label: "Réservations", icon: CalendarCheck },
];

export default function OwnerLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-screen-safe">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-gray-200 bg-white p-4 md:flex">
        <Link href="/" aria-label="Accueil LIUDOR" className="mb-6 block px-3">
          <Logo size="sm" />
        </Link>
        <span className="mb-6 block px-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
          Espace propriétaire
        </span>
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

        <BackToSiteLink className="mt-2 border-t border-gray-200 pt-3" />

        {/*
          Le portail propriétaire n'a pas le header public : l'avatar en pied de
          colonne est son accès au profil et à la déconnexion.
        */}
        <SidebarAccount className="mt-auto border-t border-gray-200 pt-3" />
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