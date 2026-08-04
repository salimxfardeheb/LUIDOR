import type { LucideIcon } from "lucide-react";
import { formatPrice } from "@/lib/format";

export interface ChipItem {
  key: string;
  label: string;
  icon: LucideIcon;
  /** Précision affichée sous le libellé (tarif d'un service, par exemple). */
  detail?: string;
}

/**
 * Grille de chips « icône + libellé », bordure fine et coins arrondis.
 * Gabarit commun aux équipements et aux services proposés.
 */
export function ChipGrid({ items }: { items: ChipItem[] }) {
  return (
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <li
          key={item.key}
          className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-xs"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary/10">
            <item.icon aria-hidden className="h-4 w-4 text-secondary" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium text-gray-900">
              {item.label}
            </span>
            {item.detail && (
              <span className="block text-xs text-gray-500">{item.detail}</span>
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Tarif d'un service, ou mention « sur devis » quand il n'est pas chiffré. */
export function servicePriceLabel(price: number): string {
  return price > 0 ? `À partir de ${formatPrice(price)}` : "Sur devis";
}
