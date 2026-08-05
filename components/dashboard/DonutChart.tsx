import * as React from "react";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface DonutSlice {
  label: string;
  value: number;
  /** Couleur CSS de la part, issue de `CHART_COLORS`. */
  color: string;
}

interface DonutChartProps {
  data: DonutSlice[];
  /** Description lue par les lecteurs d'écran, le tracé étant décoratif. */
  ariaLabel: string;
  /** Libellé sous le total, au centre de l'anneau. */
  centerLabel?: string;
  /** Total affiché au centre. Calculé depuis les parts si absent. */
  centerValue?: string;
  className?: string;
}

/**
 * Anneau de répartition, sans dépendance externe.
 *
 * Le rayon vaut `100 / 2π` : la circonférence fait donc exactement 100 unités,
 * et chaque part se dessine avec son pourcentage comme `stroke-dasharray`. Le
 * décalage de 25 fait démarrer la première part à midi plutôt qu'à 3 heures.
 */
const RADIUS = 15.915494;
const CIRCUMFERENCE = 100;
const START_OFFSET = 25;

export function DonutChart({
  data,
  ariaLabel,
  centerLabel,
  centerValue,
  className,
}: DonutChartProps) {
  const slices = data.filter((slice) => slice.value > 0);
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);

  if (total === 0) {
    return (
      <p className={cn("py-10 text-center text-sm text-gray-400", className)}>
        Aucune donnée sur cette période.
      </p>
    );
  }

  let consumed = 0;
  const segments = slices.map((slice) => {
    const percent = (slice.value / total) * CIRCUMFERENCE;
    const segment = {
      ...slice,
      percent,
      offset: START_OFFSET - consumed,
    };
    consumed += percent;
    return segment;
  });

  return (
    <div
      className={cn(
        "flex flex-col items-center gap-6 sm:flex-row sm:items-center",
        className
      )}
    >
      <div className="relative shrink-0">
        <svg
          viewBox="0 0 42 42"
          className="h-40 w-40"
          role="img"
          aria-label={ariaLabel}
        >
          <circle
            cx="21"
            cy="21"
            r={RADIUS}
            fill="none"
            stroke="rgb(var(--color-gray-100))"
            strokeWidth="5"
          />
          {segments.map((segment) => (
            <circle
              key={segment.label}
              cx="21"
              cy="21"
              r={RADIUS}
              fill="none"
              stroke={segment.color}
              strokeWidth="5"
              strokeDasharray={`${segment.percent} ${CIRCUMFERENCE - segment.percent}`}
              strokeDashoffset={segment.offset}
              // Sans cela, une part de 100 % se referme sur une jointure visible.
              strokeLinecap="butt"
            />
          ))}
        </svg>

        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold tracking-tight text-gray-900">
            {centerValue ?? formatNumber(total)}
          </span>
          {centerLabel && (
            <span className="mt-0.5 text-xs text-gray-400">{centerLabel}</span>
          )}
        </div>
      </div>

      <ul className="flex w-full min-w-0 flex-col gap-2.5">
        {segments.map((segment) => (
          <li
            key={segment.label}
            className="flex items-center justify-between gap-3 text-sm"
          >
            <span className="flex min-w-0 items-center gap-2">
              <span
                aria-hidden
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: segment.color }}
              />
              <span className="truncate text-gray-600">{segment.label}</span>
            </span>
            <span className="shrink-0 tabular-nums text-gray-900">
              <span className="font-semibold">{formatNumber(segment.value)}</span>
              <span className="ml-1.5 text-xs text-gray-400">
                {Math.round(segment.percent)} %
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
