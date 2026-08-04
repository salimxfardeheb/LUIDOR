import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/Card";

export interface KpiCardProps {
  icon: LucideIcon;
  /** Libellé court, ex. « Revenus du mois ». */
  label: string;
  /** Valeur déjà formatée pour l'affichage. */
  value: string;
  /** Précision sur la période ou le périmètre, affichée en petit. */
  note?: string;
  className?: string;
}

/** Carte d'indicateur clé : libellé, valeur mise en avant et icône. */
export function KpiCard({ icon: Icon, label, value, note, className }: KpiCardProps) {
  return (
    <Card className={className}>
      <div className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-500">{label}</p>
            <p className="mt-2 truncate text-3xl font-bold tracking-tight text-gray-900">
              {value}
            </p>
            {note && <p className="mt-1 text-xs text-gray-400">{note}</p>}
          </div>
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary-900 text-white">
            <Icon aria-hidden className="h-5 w-5" />
          </span>
        </div>
      </div>
    </Card>
  );
}
