import Link from "next/link";
import {
  LayoutDashboard,
  Users,
  Store,
  ShieldCheck,
  CalendarCheck,
  Star,
  PenLine,
  Settings,
  Mail,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/ui/Logo";
import { SidebarAccount } from "@/components/layout/SidebarAccount";

const navItems = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/salles", label: "Validation salles", icon: ShieldCheck },
  { href: "/admin/utilisateurs", label: "Utilisateurs", icon: Users },
  { href: "/admin/proprietaires", label: "Propriétaires", icon: Store },
  { href: "/admin/reservations", label: "Réservations", icon: CalendarCheck },
  { href: "/admin/avis", label: "Avis", icon: Star },
  { href: "/admin/messages", label: "Messages", icon: Mail },
  { href: "/admin/blog", label: "Blog", icon: PenLine },
  { href: "/admin/parametres", label: "Paramètres", icon: Settings },
];

export default function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-screen-safe">
      <aside className="flex w-60 shrink-0 flex-col border-r border-gray-200 bg-primary-900 p-4 text-white md:flex">
        <Link href="/" aria-label="Accueil LIUDOR" className="px-3 py-2">
          <Logo size="sm" onDark />
        </Link>
        <span className="mb-6 mt-4 flex items-center gap-2 rounded-md bg-white/10 px-3 py-2 text-sm font-semibold">
          Administration
        </span>
        <nav className="flex flex-col gap-1">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium",
                "text-gray-200 transition-colors hover:bg-white/10 hover:text-white"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>

        {/* Sidebar marine : le menu bascule sur ses variantes claires. */}
        <SidebarAccount onDark className="mt-auto border-t border-white/10 pt-3" />
      </aside>

      <div className="min-w-0 flex-1 p-6 md:p-10">{children}</div>
    </div>
  );
}