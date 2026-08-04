"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Lock } from "lucide-react";
import { toggleDateAvailability } from "@/actions/owner-availability";
import { Alert } from "@/components/ui/Alert";
import { formatDate, formatMonthYear, formatNumber } from "@/lib/format";
import {
  dayState,
  isDayEditable,
  leadingBlanks,
  WEEKDAY_INITIALS,
  type OwnerCalendarDay,
  type OwnerCalendarMonth,
  type OwnerDayState,
} from "@/lib/owner/availability-params";
import { cn } from "@/lib/utils";

/**
 * Apparence des quatre états, reprise du calendrier de la fiche salle : même
 * pastille de couleur, mêmes jetons de la charte (`success`, `error`,
 * `warning`, gris). La fiche affiche un mini calendrier, celui-ci occupe la
 * page : les cases portent en plus leur libellé sur grand écran.
 */
const STATE_META: Record<
  OwnerDayState,
  { label: string; dot: string; cell: string }
> = {
  open: {
    label: "Ouverte",
    dot: "bg-success",
    cell: "border-success/40 bg-success/5 text-gray-900 hover:border-success hover:bg-success/10",
  },
  closed: {
    label: "Fermée",
    dot: "bg-gray-300",
    cell: "border-gray-200 bg-white text-gray-500 hover:border-gray-400 hover:bg-gray-50",
  },
  booked: {
    label: "Réservée",
    dot: "bg-error",
    cell: "border-gray-200 bg-gray-100 text-gray-400",
  },
  past: {
    label: "Passée",
    dot: "bg-gray-200",
    cell: "border-transparent bg-gray-50 text-gray-300",
  },
};

/** Ordre d'affichage de la légende. */
const LEGEND_STATES: OwnerDayState[] = ["open", "closed", "booked"];

interface AvailabilityCalendarProps {
  roomId: string;
  roomName: string;
  month: OwnerCalendarMonth;
  /** `null` sur la première / dernière borne de la fenêtre gérable. */
  previousHref: string | null;
  nextHref: string | null;
}

/**
 * Calendrier mensuel d'une salle, pleine page.
 *
 * Un clic alterne l'état d'une date (ouverte ↔ fermée). L'état affiché vient
 * de la réponse de l'action, jamais d'une supposition locale : si le serveur
 * refuse — réservation confirmée entre-temps, session expirée — la case ne
 * bouge pas et le motif s'affiche.
 *
 * La navigation entre les mois passe par des liens : le mois vit dans l'URL,
 * la page est donc partageable et rechargeable, et chaque mois est chargé à la
 * demande plutôt que préchargé sur douze mois.
 *
 * Le parent monte ce composant avec une `key` dépendant de la salle et du
 * mois : changer de vue repart de l'état serveur, sans effet de synchronisation.
 */
export function AvailabilityCalendar({
  roomId,
  roomName,
  month,
  previousHref,
  nextHref,
}: AvailabilityCalendarProps) {
  const router = useRouter();
  const [days, setDays] = React.useState(month.days);
  const [pendingDates, setPendingDates] = React.useState<ReadonlySet<string>>(
    new Set()
  );
  const [error, setError] = React.useState<string | null>(null);
  const [announcement, setAnnouncement] = React.useState("");

  const monthLabel = formatMonthYear(
    new Date(Date.UTC(month.year, month.month - 1, 1))
  );
  const blanks = leadingBlanks(month.year, month.month);

  const counts = React.useMemo(() => {
    const initial: Record<OwnerDayState, number> = {
      open: 0,
      closed: 0,
      booked: 0,
      past: 0,
    };
    return days.reduce((totals, day) => {
      totals[dayState(day)] += 1;
      return totals;
    }, initial);
  }, [days]);

  async function toggle(day: OwnerCalendarDay) {
    if (!isDayEditable(day) || pendingDates.has(day.date)) return;

    setPendingDates((previous) => new Set(previous).add(day.date));
    setError(null);

    const result = await toggleDateAvailability(roomId, day.date);

    setPendingDates((previous) => {
      const next = new Set(previous);
      next.delete(day.date);
      return next;
    });

    if (!result.ok) {
      setError(result.message);
      // Le refus peut venir d'une donnée périmée (réservation confirmée depuis
      // l'affichage) : on recharge pour que la grille redevienne exacte.
      router.refresh();
      return;
    }

    setDays((previous) =>
      previous.map((item) =>
        item.date === result.date ? { ...item, status: result.status } : item
      )
    );
    setAnnouncement(
      `${formatDate(result.date)} : ${
        result.status === "AVAILABLE" ? "date ouverte" : "date fermée"
      }.`
    );
    router.refresh();
  }

  return (
    <section
      aria-labelledby="calendrier-titre"
      className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:p-6"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2
            id="calendrier-titre"
            className="truncate text-base font-semibold text-gray-900"
          >
            {roomName}
          </h2>
          <p className="mt-0.5 text-sm text-gray-500">
            {formatNumber(counts.open)} date{counts.open > 1 ? "s" : ""} ouverte
            {counts.open > 1 ? "s" : ""} ce mois-ci
            {counts.booked > 0 &&
              ` · ${formatNumber(counts.booked)} réservée${counts.booked > 1 ? "s" : ""}`}
          </p>
        </div>

        <div className="flex items-center justify-between gap-2 sm:justify-end">
          <MonthNavButton direction="prev" href={previousHref} />
          <p
            aria-live="polite"
            className="min-w-[9rem] text-center text-sm font-medium capitalize text-gray-700"
          >
            {monthLabel}
          </p>
          <MonthNavButton direction="next" href={nextHref} />
        </div>
      </div>

      {error && (
        <Alert variant="error" className="mt-4">
          {error}
        </Alert>
      )}

      <div className="mt-4 grid grid-cols-7 gap-1 sm:gap-2">
        {WEEKDAY_INITIALS.map((weekday, index) => (
          <span
            key={index}
            aria-hidden
            className="pb-1 text-center text-xs font-medium text-gray-400"
          >
            {weekday}
          </span>
        ))}

        {Array.from({ length: blanks }, (_, index) => (
          <span key={`blank-${index}`} aria-hidden />
        ))}

        {days.map((day) => (
          <DayCell
            key={day.date}
            day={day}
            pending={pendingDates.has(day.date)}
            onToggle={() => toggle(day)}
          />
        ))}
      </div>

      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>

      <div className="mt-5 flex flex-col gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-gray-500">
          {LEGEND_STATES.map((state) => (
            <li key={state} className="flex items-center gap-1.5">
              <span
                aria-hidden
                className={cn("h-2 w-2 rounded-full", STATE_META[state].dot)}
              />
              {STATE_META[state].label}
            </li>
          ))}
          <li className="flex items-center gap-1.5">
            <span aria-hidden className="h-2 w-2 rounded-full bg-warning" />
            Demande en attente
          </li>
        </ul>
        <p className="text-xs text-gray-400">
          Une date réservée est verrouillée : seul le support LIUDOR peut la
          libérer.
        </p>
      </div>
    </section>
  );
}

function DayCell({
  day,
  pending,
  onToggle,
}: {
  day: OwnerCalendarDay;
  pending: boolean;
  onToggle: () => void;
}) {
  const state = dayState(day);
  const meta = STATE_META[state];
  const editable = isDayEditable(day);
  const dayNumber = Number(day.date.slice(8, 10));

  const description = [
    formatDate(day.date),
    `${meta.label.toLowerCase()}`,
    day.requested ? "demande de réservation en attente" : null,
    editable
      ? state === "open"
        ? "cliquer pour fermer cette date"
        : "cliquer pour ouvrir cette date"
      : null,
  ]
    .filter(Boolean)
    .join(" — ");

  return (
    <button
      type="button"
      disabled={!editable || pending}
      onClick={onToggle}
      aria-label={description}
      title={description}
      className={cn(
        "flex aspect-square flex-col items-center justify-center gap-1 rounded-md border p-1",
        "text-sm transition-colors focus-visible:outline-none focus-visible:ring-2",
        "focus-visible:ring-accent/60 focus-visible:ring-offset-1 sm:gap-1.5",
        meta.cell,
        editable ? "cursor-pointer" : "cursor-not-allowed",
        pending && "opacity-60",
        // Une demande en instruction reste modifiable : elle est signalée, pas
        // verrouillée. Seule une réservation confirmée l'est.
        day.requested && "ring-1 ring-inset ring-warning/50"
      )}
    >
      <span className="flex items-center gap-1 font-medium leading-none">
        {dayNumber}
        {state === "booked" && (
          <Lock aria-hidden className="h-3 w-3 text-gray-400" />
        )}
      </span>

      <span
        aria-hidden
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          day.requested && editable ? "bg-warning" : meta.dot
        )}
      />

      <span
        aria-hidden
        className="hidden text-[11px] leading-none text-current opacity-70 lg:block"
      >
        {state === "past" ? "" : meta.label}
      </span>
    </button>
  );
}

/** Navigation d'un mois. Rendue inerte aux bornes de la fenêtre gérable. */
function MonthNavButton({
  direction,
  href,
}: {
  direction: "prev" | "next";
  href: string | null;
}) {
  const isPrev = direction === "prev";
  const Icon = isPrev ? ChevronLeft : ChevronRight;
  const label = isPrev ? "Mois précédent" : "Mois suivant";
  const className =
    "inline-flex h-9 w-9 items-center justify-center rounded-md border border-gray-300 text-gray-600 shadow-xs transition-colors hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60";

  if (!href) {
    return (
      <span
        aria-hidden
        className={cn(
          className,
          "cursor-not-allowed text-gray-300 hover:bg-transparent"
        )}
      >
        <Icon className="h-4 w-4" />
      </span>
    );
  }

  return (
    <Link href={href} scroll={false} aria-label={label} className={className}>
      <Icon aria-hidden className="h-4 w-4" />
    </Link>
  );
}
