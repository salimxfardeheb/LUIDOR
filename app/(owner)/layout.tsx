import Link from "next/link";
import {
  LayoutDashboard,
  LayoutGrid,
  CalendarDays,
  CalendarCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/ui/Logo";

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
      <aside className="hidden w-60 shrink-0 border-r border-gray-200 bg-white p-4 md:block">
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
      </aside>
      <div className="flex-1 p-6 md:p-10">{children}</div>
    </div>
  );
}