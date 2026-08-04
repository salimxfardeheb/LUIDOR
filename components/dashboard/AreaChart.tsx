"use client";

import { useId, useMemo, useState } from "react";
import { formatNumber, formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface AreaChartPoint {
  /** Libellé affiché sous l'axe, ex. « janv. ». */
  label: string;
  value: number;
}

/**
 * Format des valeurs de l'axe et de l'infobulle.
 *
 * Un nom de format, et non une fonction : ce composant est un Client Component,
 * et une fonction ne traverse pas la frontière serveur → client (elle n'est pas
 * sérialisable). Le formatage est donc résolu ici.
 */
export type AreaChartFormat = "number" | "price";

const FORMATTERS: Record<AreaChartFormat, (value: number) => string> = {
  number: formatNumber,
  price: formatPrice,
};

interface AreaChartProps {
  data: AreaChartPoint[];
  /** Description lue par les lecteurs d'écran (le graphique est décoratif). */
  ariaLabel: string;
  /** Format de la valeur dans l'infobulle et l'axe des ordonnées. */
  format?: AreaChartFormat;
  /** Affiche un libellé d'axe tous les N points pour éviter le chevauchement. */
  xAxisEvery?: number;
  className?: string;
}

/** Dimensions du viewBox, conservées à l'échelle sur toutes les tailles. */
const VIEW_W = 640;
const VIEW_H = 240;
const PAD = { top: 16, right: 16, bottom: 32, left: 40 };

const GOLD = "rgb(var(--color-secondary))";
const GRAY_200 = "rgb(var(--color-gray-200))";
const GRAY_400 = "rgb(var(--color-gray-400))";

/** Lissé Catmull-Rom : courbe douce passant par tous les points. */
function smoothLine(points: Array<{ x: number; y: number }>): string {
  if (points.length < 2) return "";
  let d = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
  }
  return d;
}

/** Graphique en aire, sans dépendance externe, aux couleurs de la charte. */
export function AreaChart({
  data,
  ariaLabel,
  format = "number",
  xAxisEvery = 1,
  className,
}: AreaChartProps) {
  const gradientId = useId();
  const [hovered, setHovered] = useState<number | null>(null);
  const formatValue = FORMATTERS[format];

  const plotW = VIEW_W - PAD.left - PAD.right;
  const plotH = VIEW_H - PAD.top - PAD.bottom;

  const geometry = useMemo(() => {
    if (data.length === 0) return null;
    const maxValue = Math.max(...data.map((point) => point.value), 1);
    const points = data.map((point, index) => ({
      x:
        PAD.left +
        (index / Math.max(data.length - 1, 1)) * plotW,
      y:
        PAD.top +
        (1 - point.value / maxValue) * plotH,
    }));
    return { points, maxValue };
  }, [data, plotW, plotH]);

  if (!geometry) {
    return (
      <div
        className={cn(
          "flex h-48 items-center justify-center text-sm text-gray-400",
          className
        )}
      >
        Aucune donnée à afficher.
      </div>
    );
  }

  const { points, maxValue } = geometry;
  const baseline = PAD.top + plotH;
  const linePath = smoothLine(points);
  const areaPath = `${linePath} L ${points[points.length - 1].x.toFixed(
    2
  )} ${baseline} L ${points[0].x.toFixed(2)} ${baseline} Z`;

  const gridLines = [0, 0.25, 0.5, 0.75, 1];
  const hoveredPoint = hovered !== null ? points[hovered] : null;

  return (
    <div className={cn("relative w-full", className)}>
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="h-auto w-full"
        role="img"
        aria-label={ariaLabel}
      >
        <defs>
          <linearGradient
            id={gradientId}
            x1="0"
            y1="0"
            x2="0"
            y2="1"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor={GOLD} stopOpacity="0.35" />
            <stop offset="100%" stopColor={GOLD} stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Grille horizontale + valeurs d'ordonnée */}
        {gridLines.map((fraction) => {
          const y = baseline - fraction * plotH;
          const value = Math.round(maxValue * fraction);
          return (
            <g key={fraction}>
              <line
                x1={PAD.left}
                x2={VIEW_W - PAD.right}
                y1={y}
                y2={y}
                stroke={GRAY_200}
                strokeWidth="1"
              />
              <text
                x={PAD.left - 8}
                y={y + 3}
                textAnchor="end"
                fontSize="10"
                fill={GRAY_400}
              >
                {formatValue(value)}
              </text>
            </g>
          );
        })}

        {/* Aire et ligne */}
        <path d={areaPath} fill={`url(#${gradientId})`} />
        <path
          d={linePath}
          fill="none"
          stroke={GOLD}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Guide vertical + point au survol */}
        {hoveredPoint && hovered !== null && (
          <g aria-hidden>
            <line
              x1={hoveredPoint.x}
              x2={hoveredPoint.x}
              y1={PAD.top}
              y2={baseline}
              stroke={GRAY_400}
              strokeWidth="1"
              strokeDasharray="3 3"
            />
            <circle
              cx={hoveredPoint.x}
              cy={hoveredPoint.y}
              r="4"
              fill={GOLD}
              stroke="white"
              strokeWidth="2"
            />
          </g>
        )}

        {/* Libellés de l'axe des abscisses */}
        {data.map((point, index) => {
          if (index % xAxisEvery !== 0) return null;
          return (
            <text
              key={point.label}
              x={points[index].x}
              y={VIEW_H - PAD.bottom + 18}
              textAnchor="middle"
              fontSize="10"
              fill={GRAY_400}
            >
              {point.label}
            </text>
          );
        })}

        {/* Zones de survol, une par point */}
        {data.map((point, index) => {
          const prev = index > 0 ? points[index - 1].x : points[index].x;
          const next =
            index < points.length - 1
              ? points[index + 1].x
              : points[index].x;
          const left = (prev + points[index].x) / 2;
          const right = (points[index].x + next) / 2;
          return (
            <rect
              key={point.label}
              x={left}
              y={PAD.top}
              width={right - left}
              height={plotH}
              fill="transparent"
              onMouseEnter={() => setHovered(index)}
              onMouseLeave={() => setHovered(null)}
              onFocus={() => setHovered(index)}
              onBlur={() => setHovered(null)}
            />
          );
        })}
      </svg>

      {/* Infobulle HTML positionnée en coordonnées de viewBox */}
      {hovered !== null && hoveredPoint && (
        <div
          aria-hidden
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-md border border-gray-200 bg-white px-3 py-2 text-center shadow-md"
          style={{
            left: `${(hoveredPoint.x / VIEW_W) * 100}%`,
            top: `${(hoveredPoint.y / VIEW_H) * 100}%`,
          }}
        >
          <p className="whitespace-nowrap text-xs font-semibold text-gray-900">
            {data[hovered].label}
          </p>
          <p className="whitespace-nowrap text-xs text-gray-500">
            {formatValue(data[hovered].value)}
          </p>
        </div>
      )}
    </div>
  );
}
