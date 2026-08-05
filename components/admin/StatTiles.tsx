import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

/** Teintes de la pastille d'icône, alignées sur celles du tableau de bord. */
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
        "grid grid-cols-2 gap-4 lg:grid-cols-4",
        className
      )}
    >
      {tiles.map(({ icon: Icon, label, value, tone = "neutral" }) => (
        <Card key={label} className="flex items-center gap-3 p-4">
          <span
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-md",
              TONES[tone]
            )}
          >
            <Icon aria-hidden className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-gray-500">{label}</p>
            <p className="text-xl font-bold tracking-tight text-gray-900">
              {value}
            </p>
          </div>
        </Card>
      ))}
    </div>
  );
}
