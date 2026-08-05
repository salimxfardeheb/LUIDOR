"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LifeBuoy, Menu, X } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { BackToSiteLink } from "@/components/layout/BackToSiteLink";
import { SidebarAccount } from "@/components/layout/SidebarAccount";
import { ADMIN_NAV, activeAdminHref } from "@/lib/admin/navigation";
import { cn } from "@/lib/utils";

/**
 * Colonne de navigation de l'administration.
 *
 * Fixe à partir de `md` (la liste est longue : elle défile indépendamment du
 * contenu), et repliée en tiroir sur mobile. Composant client pour deux
 * raisons : `usePathname` détermine l'entrée active, et le tiroir a un état.
 */
export function AdminSidebar() {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  const activeHref = activeAdminHref(pathname);

  // Une navigation referme le tiroir : sur mobile, la page rendue derrière
  // resterait sinon masquée par l'overlay.
  React.useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Échap referme le tiroir, comme toute surface superposée.
  React.useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <>
      {/* Barre mobile : la colonne est masquée, ce bandeau la rappelle. */}
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-white/10 bg-primary-900 px-4 py-2 md:hidden">
        <Link href="/" aria-label="Accueil LIUDOR">
          <Logo size="sm" onDark showTagline={false} />
        </Link>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-expanded={open}
          aria-controls="admin-sidebar"
          className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-gray-200 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
        >
          <Menu aria-hidden className="h-5 w-5" />
          Menu
        </button>
      </div>

      {open && (
        <div
          role="presentation"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 bg-primary-900/60 md:hidden"
        />
      )}

      <aside
        id="admin-sidebar"
        aria-label="Navigation de l'administration"
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85%] flex-col overflow-y-auto",
          "bg-primary-900 p-4 text-white transition-transform duration-200",
          "md:w-64 md:max-w-none md:translate-x-0 md:visible",
          // `invisible` et pas seulement le décalage : un tiroir fermé mais
          // encore visible pour le navigateur garderait ses liens dans l'ordre
          // de tabulation, hors de l'écran.
          open ? "translate-x-0" : "invisible -translate-x-full"
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <Link href="/" aria-label="Accueil LIUDOR" className="px-2 py-1">
            <Logo size="sm" onDark />
          </Link>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-md p-2 text-gray-300 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary md:hidden"
          >
            <X aria-hidden className="h-5 w-5" />
            <span className="sr-only">Fermer le menu</span>
          </button>
        </div>

        <p className="mb-4 mt-4 rounded-md bg-white/10 px-3 py-2 text-sm font-semibold">
          Administration
        </p>

        <nav className="flex flex-1 flex-col gap-6">
          {ADMIN_NAV.map((group) => (
            <div key={group.title}>
              <h2 className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-400">
                {group.title}
              </h2>
              <ul className="flex flex-col gap-1">
                {group.items.map(({ href, label, icon: Icon }) => {
                  const isActive = href === activeHref;
                  return (
                    <li key={href}>
                      <Link
                        href={href}
                        aria-current={isActive ? "page" : undefined}
                        className={cn(
                          "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-primary-900",
                          isActive
                            ? "bg-secondary font-semibold text-primary-900 shadow-sm"
                            : "text-gray-200 hover:bg-white/10 hover:text-white"
                        )}
                      >
                        <Icon aria-hidden className="h-4 w-4 shrink-0" />
                        <span className="truncate">{label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <SidebarHelpCard />

        <BackToSiteLink onDark className="mt-3 border-t border-white/10 pt-3" />

        {/* Colonne marine : le menu compte bascule sur ses variantes claires. */}
        <SidebarAccount onDark className="border-t border-white/10 pt-3" />
      </aside>
    </>
  );
}

/** Bloc d'aide en pied de colonne : la sortie vers le support humain. */
function SidebarHelpCard() {
  return (
    <div className="mt-6 rounded-lg bg-white/10 p-4">
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-primary-900">
        <LifeBuoy aria-hidden className="h-5 w-5" />
      </span>
      <p className="mt-3 text-sm font-semibold text-white">Besoin d&apos;aide ?</p>
      <p className="mt-1 text-xs leading-relaxed text-gray-300">
        Une question sur la modération d&apos;une salle ou sur un compte ?
        L&apos;équipe LIUDOR vous répond.
      </p>
      <Link
        href="/contact"
        className="mt-3 inline-flex w-full items-center justify-center rounded-md bg-secondary px-3 py-2 text-xs font-semibold text-primary-900 transition-colors hover:bg-secondary-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-primary-900"
      >
        Contacter le support
      </Link>
    </div>
  );
}
