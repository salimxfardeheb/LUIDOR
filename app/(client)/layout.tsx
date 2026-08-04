import Link from "next/link";
import { User, CalendarClock, Heart, Clock3 } from "lucide-react";
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
        <nav className="sticky top-8 flex flex-col gap-1">
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
      <div className="flex-1">{children}</div>
    </div>
  );
}