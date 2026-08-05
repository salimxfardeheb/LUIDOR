import * as React from "react";
import { formatNumber } from "@/lib/format";
import { seriesColor } from "@/components/dashboard/chart-colors";
import { cn } from "@/lib/utils";

export interface BarListItem {
  label: string;
  value: number;
  /** Couleur CSS de la barre. Prise dans la palette de série si absente. */
  color?: string;
}

/**
 * Barres horizontales classées par valeur décroissante.
 *
 * Rendu en liste plutôt qu'en SVG : les libellés et les valeurs restent du
 * texte sélectionnable, lisible par un lecteur d'écran sans description de
 * remplacement, et la barre n'est qu'un repère visuel.
 */
export function BarList({
  data,
  emptyMessage = "Aucune donnée sur cette période.",
  className,
}: {
  data: BarListItem[];
  emptyMessage?: string;
  className?: string;
}) {
  const items = data.filter((item) => item.value > 0);

  if (items.length === 0) {
    return (
      <p className={cn("py-10 text-center text-sm text-gray-400", className)}>
        {emptyMessage}
      </p>
    );
  }

  const max = Math.max(...items.map((item) => item.value));

  return (
    <ul className={cn("flex flex-col gap-4", className)}>
      {items.map((item, index) => (
        <li key={item.label} className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate font-medium text-gray-700">
              {item.label}
            </span>
            <span className="shrink-0 font-semibold tabular-nums text-gray-900">
              {formatNumber(item.value)}
            </span>
          </div>
          <div
            aria-hidden
            className="h-2 w-full overflow-hidden rounded-full bg-gray-100"
          >
            <div
              className="h-full rounded-full"
              style={{
                width: `${(item.value / max) * 100}%`,
                backgroundColor: item.color ?? seriesColor(index),
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
