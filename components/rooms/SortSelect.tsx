"use client";

import { useRouter } from "next/navigation";
import { ArrowUpDown } from "lucide-react";
import { Select } from "@/components/ui/Select";
import {
  buildRoomsQuery,
  SORT_OPTIONS,
  type RoomFilters,
  type SortKey,
} from "@/lib/rooms/search-params";

/**
 * Tri des résultats.
 *
 * Le tri vit dans l'URL comme les autres critères : changer d'option remplace
 * l'entrée d'historique courante (inutile d'empiler un cran de retour par
 * changement de tri) et repart de la page 1.
 */
export function SortSelect({ filters }: { filters: RoomFilters }) {
  const router = useRouter();

  return (
    <div className="flex shrink-0 items-center gap-2">
      <label
        htmlFor="tri"
        className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-semibold uppercase tracking-wide text-gray-500"
      >
        <ArrowUpDown aria-hidden className="h-4 w-4 text-secondary" />
        Trier par
      </label>
      <Select
        id="tri"
        name="tri"
        value={filters.tri}
        onChange={(event) => {
          const query = buildRoomsQuery(filters, {
            tri: event.target.value as SortKey,
            page: 1,
          });
          router.replace(
            query ? `/salles/resultats?${query}` : "/salles/resultats",
            { scroll: false }
          );
        }}
        className="w-52"
      >
        {SORT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
    </div>
  );
}
