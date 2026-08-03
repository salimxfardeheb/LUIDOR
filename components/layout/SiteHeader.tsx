"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, Menu, X } from "lucide-react";
import { LogoMark } from "@/components/ui/Logo";
import { HeaderAuth } from "@/components/layout/HeaderAuth";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/", label: "Accueil" },
  { href: "/salles", label: "Explorer les salles" },
  { href: "/owner/salles/nouvelle", label: "Publier une salle" },
  { href: "/a-propos", label: "À propos" },
  { href: "/contact", label: "Contact" },
] as const;

/** Barre de navigation publique : fond marine, fixée en haut de page. */
export function SiteHeader() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = React.useState(false);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  // Referme le menu mobile à chaque navigation.
  React.useEffect(() => setMenuOpen(false), [pathname]);

  return (
    <header className="sticky top-0 z-50 bg-primary-900 text-white shadow-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-primary-900"
          aria-label="LIUDOR — retour à l'accueil"
        >
          <LogoMark size={32} priority />
          <span className="text-lg font-semibold tracking-[0.2em] text-white">
            LIUDOR
          </span>
        </Link>

        <nav aria-label="Navigation principale" className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  aria-current={isActive(link.href) ? "page" : undefined}
                  className={cn(
                    "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-primary-900",
                    isActive(link.href)
                      ? "bg-white/10 text-secondary-400"
                      : "text-gray-200 hover:bg-white/5 hover:text-white"
                  )}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/favoris"
            aria-label="Mes favoris"
            className="hidden rounded-md p-2 text-gray-200 transition-colors hover:bg-white/10 hover:text-secondary-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-primary-900 sm:inline-flex"
          >
            <Heart aria-hidden className="h-5 w-5" />
          </Link>

          <div className="hidden sm:block">
            <HeaderAuth onDark />
          </div>

          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-controls="site-menu-mobile"
            aria-label={menuOpen ? "Fermer le menu" : "Ouvrir le menu"}
            className="rounded-md p-2 text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-primary-900 lg:hidden"
          >
            {menuOpen ? (
              <X aria-hidden className="h-5 w-5" />
            ) : (
              <Menu aria-hidden className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div
          id="site-menu-mobile"
          className="border-t border-white/10 bg-primary-900 lg:hidden"
        >
          <nav aria-label="Navigation mobile" className="mx-auto max-w-7xl px-4 py-3 sm:px-6">
            <ul className="flex flex-col gap-1">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    aria-current={isActive(link.href) ? "page" : undefined}
                    className={cn(
                      "block rounded-md px-3 py-2.5 text-sm font-medium",
                      isActive(link.href)
                        ? "bg-white/10 text-secondary-400"
                        : "text-gray-200 hover:bg-white/5 hover:text-white"
                    )}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
              <li className="mt-2 border-t border-white/10 pt-3 sm:hidden">
                <HeaderAuth onDark />
              </li>
            </ul>
          </nav>
        </div>
      )}
    </header>
  );
}
