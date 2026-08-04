"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { formatDate, formatMonthYear } from "@/lib/format";
import type { CalendarMonth, DayStatus } from "@/lib/rooms/detail";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["L", "M", "M", "J", "V", "S", "D"] as const;

const DOT_CLASSES: Record<DayStatus, string> = {
  available: "bg-success",
  booked: "bg-error",
  pending: "bg-warning",
  closed: "bg-gray-200",
};

const STATUS_LABEL: Record<DayStatus, string> = {
  available: "disponible",
  booked: "réservé",
  pending: "en attente",
  closed: "non ouvert à la réservation",
};

/**
 * Mini calendrier de disponibilité.
 *
 * Les mois sont préchargés côté serveur : la navigation ne déclenche aucune
 * requête. Chaque jour porte un point coloré (disponible, réservé, en attente)
 * et la date sélectionnée est entourée.
 */
export function AvailabilityCalendar({ months }: { months: CalendarMonth[] }) {
  const [monthIndex, setMonthIndex] = React.useState(0);
  const [selected, setSelected] = React.useState<string | null>(null);

  if (months.length === 0) return null;

  const month = months[monthIndex];
  const label = formatMonthYear(
    new Date(Date.UTC(month.year, month.month - 1, 1))
  );

  // Décalage pour aligner le 1er du mois sur une semaine démarrant le lundi.
  const firstWeekday = new Date(
    Date.UTC(month.year, month.month - 1, 1)
  ).getUTCDay();
  const leadingBlanks = (firstWeekday + 6) % 7;

  return (
    <section
      aria-labelledby="calendrier-titre"
      className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 id="calendrier-titre" className="text-sm font-semibold text-gray-900">
          Disponibilité
        </h2>
        <div className="flex items-center gap-1">
          <NavButton
            direction="prev"
            disabled={monthIndex === 0}
            onClick={() => setMonthIndex((index) => index - 1)}
          />
          <NavButton
            direction="next"
            disabled={monthIndex === months.length - 1}
            onClick={() => setMonthIndex((index) => index + 1)}
          />
        </div>
      </div>

      <p aria-live="polite" className="mt-3 text-center text-sm font-medium capitalize text-gray-700">
        {label}
      </p>

      <div className="mt-3 grid grid-cols-7 gap-y-1 text-center">
        {WEEKDAYS.map((weekday, index) => (
          <span
            key={index}
            aria-hidden
            className="pb-1 text-xs font-medium text-gray-400"
          >
            {weekday}
          </span>
        ))}

        {Array.from({ length: leadingBlanks }, (_, index) => (
          <span key={`blank-${index}`} aria-hidden />
        ))}

        {month.days.map((day) => {
          const dayNumber = Number(day.date.slice(8, 10));
          const isSelected = selected === day.date;
          const selectable = day.status !== "closed";

          return (
            <button
              key={day.date}
              type="button"
              disabled={!selectable}
              onClick={() => setSelected(isSelected ? null : day.date)}
              aria-pressed={isSelected}
              aria-label={`${formatDate(day.date)} — ${STATUS_LABEL[day.status]}`}
              className={cn(
                "mx-auto flex h-8 w-8 flex-col items-center justify-center gap-0.5 rounded-full text-xs transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60",
                selectable
                  ? "text-gray-700 hover:bg-gray-100"
                  : "cursor-not-allowed text-gray-300",
                // Date sélectionnée : entourée, comme dans la maquette.
                isSelected && "ring-2 ring-secondary ring-offset-1"
              )}
            >
              <span className="leading-none">{dayNumber}</span>
              <span
                aria-hidden
                className={cn("h-1 w-1 rounded-full", DOT_CLASSES[day.status])}
              />
            </button>
          );
        })}
      </div>

      <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 border-t border-gray-100 pt-3 text-xs text-gray-500">
        {(["available", "booked", "pending"] as DayStatus[]).map((status) => (
          <li key={status} className="flex items-center gap-1.5">
            <span
              aria-hidden
              className={cn("h-2 w-2 rounded-full", DOT_CLASSES[status])}
            />
            <span className="capitalize">{STATUS_LABEL[status]}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function NavButton({
  direction,
  disabled,
  onClick,
}: {
  direction: "prev" | "next";
  disabled: boolean;
  onClick: () => void;
}) {
  const isPrev = direction === "prev";
  const Icon = isPrev ? ChevronLeft : ChevronRight;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={isPrev ? "Mois précédent" : "Mois suivant"}
      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 text-gray-600 shadow-xs transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-300 disabled:hover:bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
    >
      <Icon aria-hidden className="h-4 w-4" />
    </button>
  );
}
