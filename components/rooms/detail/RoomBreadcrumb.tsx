import Link from "next/link";
import { ChevronRight } from "lucide-react";

/**
 * Fil d'Ariane : Accueil > Ville > Quartier > Nom de la salle.
 *
 * Ville et quartier pointent vers la recherche filtrée, ce qui en fait de vrais
 * raccourcis de navigation et pas seulement un repère de position. Le quartier
 * est omis quand la salle n'en a pas renseigné.
 */
export function RoomBreadcrumb({
  city,
  district,
  roomName,
}: {
  city: string;
  district: string | null;
  roomName: string;
}) {
  const trail = [
    { label: "Accueil", href: "/" },
    { label: city, href: `/salles/resultats?ville=${encodeURIComponent(city)}` },
    ...(district
      ? [
          {
            label: district,
            href: `/salles/resultats?ville=${encodeURIComponent(district)}`,
          },
        ]
      : []),
  ];

  return (
    <nav aria-label="Fil d'Ariane">
      <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-gray-500">
        {trail.map((step) => (
          <li key={step.href} className="flex items-center gap-x-1.5">
            <Link
              href={step.href}
              className="rounded-sm transition-colors hover:text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2"
            >
              {step.label}
            </Link>
            <ChevronRight aria-hidden className="h-3.5 w-3.5 text-gray-300" />
          </li>
        ))}
        <li aria-current="page" className="font-medium text-gray-900">
          {roomName}
        </li>
      </ol>
    </nav>
  );
}
