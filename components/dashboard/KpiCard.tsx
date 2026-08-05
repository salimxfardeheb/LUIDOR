import * as React from "react";
import { ArrowDownRight, ArrowRight, ArrowUpRight, type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { formatChange } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface KpiTrend {
  /**
   * Variation relative (`0.125` = +12,5 %), ou `null` quand la période de
   * référence est à zéro : on affiche alors une mention neutre plutôt qu'une
   * hausse infinie.
   */
  change: number | null;
  /** Période de comparaison, ex. « vs janvier 2026 ». */
  label: string;
  /**
   * Une hausse est-elle une bonne nouvelle ? `false` pour un indicateur qu'on
   * cherche à faire baisser (annulations, litiges).
   */
  positiveIsGood?: boolean;
}

/** Teintes disponibles pour la pastille d'icône, toutes issues de la charte. */
const TONES = {
  primary: "bg-primary-900 text-white",
  secondary: "bg-secondary text-primary-900",
  accent: "bg-accent text-white",
  success: "bg-success/15 text-success",
} as const;

export interface KpiCardProps {
  icon: LucideIcon;
  /** Libellé court, ex. « Revenus du mois ». */
  label: string;
  /** Valeur déjà formatée pour l'affichage. */
  value: string;
  /** Précision sur la période ou le périmètre, affichée en petit. */
  note?: string;
  /** Évolution par rapport à la période précédente. */
  trend?: KpiTrend;
  tone?: keyof typeof TONES;
  className?: string;
}

/** Carte d'indicateur clé : libellé, valeur mise en avant, icône et évolution. */
export function KpiCard({
  icon: Icon,
  label,
  value,
  note,
  trend,
  tone = "primary",
  className,
}: KpiCardProps) {
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
          <span
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-md",
              TONES[tone]
            )}
          >
            <Icon aria-hidden className="h-5 w-5" />
          </span>
        </div>

        {trend && <KpiTrendPill {...trend} />}
      </div>
    </Card>
  );
}

/** Pastille d'évolution : flèche, pourcentage signé et période de référence. */
function KpiTrendPill({ change, label, positiveIsGood = true }: KpiTrend) {
  if (change === null) {
    return (
      <p className="mt-4 text-xs text-gray-400">
        Aucune donnée sur la période précédente
      </p>
    );
  }

  const isFlat = change === 0;
  const isGood = positiveIsGood ? change > 0 : change < 0;
  const TrendIcon = isFlat ? ArrowRight : change > 0 ? ArrowUpRight : ArrowDownRight;

  return (
    <p className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold",
          isFlat
            ? "bg-gray-100 text-gray-600"
            : isGood
              ? "bg-success/10 text-success"
              : "bg-error/10 text-error"
        )}
      >
        <TrendIcon aria-hidden className="h-3.5 w-3.5" />
        {formatChange(change)}
      </span>
      <span className="text-gray-400">{label}</span>
    </p>
  );
}
