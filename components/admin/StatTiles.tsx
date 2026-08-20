import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

/** Teintes de la pastille d'icône. */
const TONES = {
  neutral: "bg-gray-100 text-gray-600",
  primary: "bg-primary-900/10 text-primary-900",
  secondary: "bg-secondary/20 text-primary-900",
  accent: "bg-accent/15 text-accent",
  warning: "bg-warning/15 text-warning",
  error: "bg-error/15 text-error",
} as const;

export interface StatTile {
  icon: LucideIcon;
  label: string;
  /** Valeur déjà formatée. */
  value: string;
  tone?: keyof typeof TONES;
}

/**
 * Bandeau de compteurs au-dessus d'une liste.
 *
 * Plus compact que les `KpiCard` du tableau de bord : ici le chiffre situe la
 * liste qui suit, il n'est pas le sujet de la page.
 *
 * Icône au-dessus et non à gauche : un montant formaté (« 1 790 000 DA ») est
 * un bloc insécable — ses séparateurs sont des espaces insécables — que rien ne
 * peut rétrécir. Posé à côté d'une pastille, il sortait de la carte dès que la
 * grille passait à quatre colonnes. Sur toute la largeur de la tuile, il tient.
 * `break-words` reste le filet de sécurité pour une valeur hors norme.
 */
export function StatTiles({
  tiles,
  className,
}: {
  tiles: StatTile[];
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4",
        className
      )}
    >
      {tiles.map(({ icon: Icon, label, value, tone = "neutral" }) => (
        <Card key={label} className="flex flex-col gap-3 p-4">
          <div className="flex items-center gap-3">
            <span
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-md",
                TONES[tone]
              )}
            >
              <Icon aria-hidden className="h-4 w-4" />
            </span>
            <p className="min-w-0 flex-1 text-xs font-medium text-gray-500">
              {label}
            </p>
          </div>
          <p className="break-words text-xl font-bold tracking-tight text-gray-900 tabular-nums">
            {value}
          </p>
        </Card>
      ))}
    </div>
  );
}
