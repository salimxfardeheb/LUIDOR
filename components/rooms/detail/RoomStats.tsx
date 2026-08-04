import {
  BedDouble,
  LayoutGrid,
  Ruler,
  SquareParking,
  Users,
  type LucideIcon,
} from "lucide-react";
import { formatNumber } from "@/lib/format";

interface Stat {
  icon: LucideIcon;
  label: string;
  value: string;
}

/**
 * Ligne de statistiques rapides, séparées par des filets verticaux.
 *
 * Une caractéristique non renseignée est simplement absente de la ligne : mieux
 * vaut quatre repères fiables que cinq dont un affiche « — ».
 */
export function RoomStats({
  capacityMax,
  surfaceM2,
  spacesCount,
  hasParking,
  hasAccommodation,
}: {
  capacityMax: number;
  surfaceM2: number | null;
  spacesCount: number | null;
  hasParking: boolean;
  hasAccommodation: boolean;
}) {
  const stats: Stat[] = [
    {
      icon: Users,
      label: "Capacité max",
      value: `${formatNumber(capacityMax)} invités`,
    },
    ...(surfaceM2 !== null
      ? [
          {
            icon: Ruler,
            label: "Surface",
            value: `${formatNumber(surfaceM2)} m²`,
          },
        ]
      : []),
    ...(spacesCount !== null
      ? [
          {
            icon: LayoutGrid,
            label: "Espaces",
            value: `${spacesCount} ${spacesCount > 1 ? "espaces" : "espace"}`,
          },
        ]
      : []),
    {
      icon: SquareParking,
      label: "Parking",
      value: hasParking ? "Oui" : "Non",
    },
    {
      icon: BedDouble,
      label: "Hébergement",
      value: hasAccommodation ? "Oui" : "Non",
    },
  ];

  return (
    <dl className="flex flex-wrap items-stretch gap-y-4 rounded-lg border border-gray-200 bg-white px-2 py-4 shadow-xs">
      {stats.map((stat, index) => (
        <div
          key={stat.label}
          className={
            // Filet vertical entre les blocs, jamais avant le premier.
            "flex min-w-[8.5rem] flex-1 items-center gap-3 px-4" +
            (index > 0 ? " border-l border-gray-200" : "")
          }
        >
          <stat.icon aria-hidden className="h-5 w-5 shrink-0 text-secondary" />
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
              {stat.label}
            </dt>
            <dd className="text-sm font-semibold text-gray-900">
              {stat.value}
            </dd>
          </div>
        </div>
      ))}
    </dl>
  );
}
