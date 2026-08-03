import Link from "next/link";
import {
  LayoutDashboard,
  Users,
  Store,
  ShieldCheck,
  CreditCard,
  Star,
  PenLine,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/utilisateurs", label: "Utilisateurs", icon: Users },
  { href: "/admin/proprietaires", label: "Propriétaires", icon: Store },
  { href: "/admin/validation-salles", label: "Validation salles", icon: ShieldCheck },
  { href: "/admin/paiements", label: "Paiements", icon: CreditCard },
  { href: "/admin/avis", label: "Avis", icon: Star },
  { href: "/admin/blog", label: "Blog", icon: PenLine },
];

export default function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-screen">
      <aside className="flex w-60 shrink-0 flex-col border-r border-gray-200 bg-primary-900 p-4 text-white md:flex">
        <span className="mb-6 flex items-center gap-2 rounded-md bg-white/10 px-3 py-2 text-sm font-semibold">
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
      </aside>
      <div className="flex-1 p-6 md:p-10">{children}</div>
    </div>
  );
}