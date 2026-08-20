"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CalendarRange,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Lock,
} from "lucide-react";
import {
  setDateRangeAvailability,
  toggleDateAvailability,
  type SetRangeActionResult,
} from "@/actions/owner-availability";
import { Alert } from "@/components/ui/Alert";
import { formatDate, formatMonthYear, formatNumber } from "@/lib/format";
import {
  buildAvailabilityHref,
  dayState,
  isDayEditable,
  lastEditableDate,
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

/** Date du jour au format `YYYY-MM-DD`, en UTC (même convention que le serveur). */
function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Nombre de jours d'une période inclusive, ou `null` si le couple est invalide. */
function daysInPeriod(from: string, to: string): number | null {
  if (from > to) return null;
  const start = new Date(`${from}T00:00:00.000Z`);
  const end = new Date(`${to}T00:00:00.000Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  return Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
}

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
 * Le panneau « Du / Au » applique le même état à une période entière : les
 * dates passées et les dates verrouillées par une réservation sont ignorées,
 * et le résumé des dates réellement modifiées revient de l'action.
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

  const today = todayIso();
  const minDate = today;
  const maxDate = lastEditableDate();

  const monthLabel = formatMonthYear(
    new Date(Date.UTC(month.year, month.month - 1, 1))
  );
  const blanks = leadingBlanks(month.year, month.month);

  const now = new Date();
  const currentMonthKey = `${now.getUTCFullYear()}-${String(
    now.getUTCMonth() + 1
  ).padStart(2, "0")}`;
  const isCurrentMonth = month.key === currentMonthKey;

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

  // Période du panneau « Du / Au », pré-remplie sur le mois affiché : le
  // composant est monté avec une clé salle-mois, les valeurs repartent donc de
  // zéro à chaque changement de vue.
  const [rangeStart, setRangeStart] = React.useState(
    `${month.year}-${String(month.month).padStart(2, "0")}-01`
  );
  const [rangeEnd, setRangeEnd] = React.useState(
    new Date(Date.UTC(month.year, month.month, 0)).toISOString().slice(0, 10)
  );
  const [rangeBusy, setRangeBusy] = React.useState(false);
  const [rangeFeedback, setRangeFeedback] = React.useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);

  const rangeStats = React.useMemo(() => {
    const total = daysInPeriod(rangeStart, rangeEnd);
    if (total === null) return null;
    const inMonth = days.filter(
      (day) => day.date >= rangeStart && day.date <= rangeEnd
    );
    const openInMonth = inMonth.filter(
      (day) => dayState(day) === "open"
    ).length;
    return { total, inMonth: inMonth.length, openInMonth };
  }, [days, rangeStart, rangeEnd]);

  const rangeValid = rangeStats !== null;

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

  async function applyRange(open: boolean) {
    if (!rangeValid || rangeBusy) return;

    // Garde côté client avant d'appeler l'action : le serveur applique les
    // mêmes bornes, cette étape rend simplement le résumé fidèle à la période
    // réellement modifiée.
    const from = rangeStart < minDate ? minDate : rangeStart;
    const to = rangeEnd > maxDate ? maxDate : rangeEnd;

    if (from > to) {
      setRangeFeedback({
        tone: "error",
        message: "Cette période est entièrement passée.",
      });
      return;
    }

    setRangeBusy(true);
    setRangeFeedback(null);

    const result = await setDateRangeAvailability(roomId, from, to, open);

    setRangeBusy(false);

    if (!result.ok) {
      setRangeFeedback({ tone: "error", message: result.message });
      // Un refus peut provenir d'une donnée périmée : on recharge la grille.
      router.refresh();
      return;
    }

    reflectRangeResult(result);

    setRangeFeedback({
      tone: "success",
      message: `Période appliquée : ${formatNumber(result.opened)} date${
        result.opened > 1 ? "s" : ""
      } ouverte${result.opened > 1 ? "s" : ""}, ${formatNumber(
        result.closed
      )} fermée${result.closed > 1 ? "s" : ""}, ${formatNumber(
        result.skipped
      )} ignorée${result.skipped > 1 ? "s" : ""}.`,
    });
    setAnnouncement(
      `${formatNumber(result.opened)} date${result.opened > 1 ? "s" : ""} ouvertes, ${formatNumber(
        result.closed
      )} fermées, ${formatNumber(result.skipped)} ignorées.`
    );
    router.refresh();
  }

  /** Repousse dans la grille affichée les dates de la période déjà visibles. */
  function reflectRangeResult(result: SetRangeActionResult & { ok: true }) {
    const appliedByDate = new Map(result.dates.map((item) => [item.date, item.status]));
    setDays((previous) =>
      previous.map((item) => {
        const status = appliedByDate.get(item.date);
        return status ? { ...item, status } : item;
      })
    );
  }

  return (
    <section
      aria-labelledby="calendrier-titre"
      className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:p-6"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2
            id="calendrier-titre"
            className="truncate text-base font-semibold text-gray-900"
          >
            {roomName}
          </h2>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <StatPill
              tone="success"
              label={`${formatNumber(counts.open)} ouverte${counts.open > 1 ? "s" : ""}`}
            />
            <StatPill
              tone="error"
              label={`${formatNumber(counts.booked)} réservée${counts.booked > 1 ? "s" : ""}`}
            />
            <StatPill
              tone="muted"
              label={`${formatNumber(counts.closed)} fermée${counts.closed > 1 ? "s" : ""}`}
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 sm:justify-end">
          <MonthNavButton direction="prev" href={previousHref} />
          <div className="flex min-w-[9rem] flex-col items-center gap-0.5">
            <p
              aria-live="polite"
              className="text-sm font-semibold capitalize text-gray-900"
            >
              {monthLabel}
            </p>
            {!isCurrentMonth && (
              <Link
                href={buildAvailabilityHref(roomId, currentMonthKey)}
                scroll={false}
                className="text-xs font-medium text-accent transition-colors hover:text-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
              >
                Aujourd&apos;hui
              </Link>
            )}
          </div>
          <MonthNavButton direction="next" href={nextHref} />
        </div>
      </div>

      <RangePanel
        start={rangeStart}
        end={rangeEnd}
        minDate={minDate}
        maxDate={maxDate}
        busy={rangeBusy}
        stats={rangeStats}
        valid={rangeValid}
        feedback={rangeFeedback}
        onStartChange={(value) => {
          setRangeStart(value);
          setRangeFeedback(null);
        }}
        onEndChange={(value) => {
          setRangeEnd(value);
          setRangeFeedback(null);
        }}
        onApply={applyRange}
      />

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
            className="pb-1 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-400"
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
            today={today}
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

/**
 * Application groupée d'un état sur une période. Les champs natifs `date`
 * bornent la saisie à la fenêtre gérable (aujourd'hui → + 11 mois).
 */
function RangePanel({
  start,
  end,
  minDate,
  maxDate,
  busy,
  stats,
  valid,
  feedback,
  onStartChange,
  onEndChange,
  onApply,
}: {
  start: string;
  end: string;
  minDate: string;
  maxDate: string;
  busy: boolean;
  stats: { total: number; inMonth: number; openInMonth: number } | null;
  valid: boolean;
  feedback: { tone: "success" | "error"; message: string } | null;
  onStartChange: (value: string) => void;
  onEndChange: (value: string) => void;
  onApply: (open: boolean) => void;
}) {
  const applyDisabled = !valid || busy;

  return (
    <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4 sm:p-5">
      <div className="flex items-start gap-2.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-white text-accent ring-1 ring-gray-200">
          <CalendarRange aria-hidden className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-gray-900">
            Ouvrir ou fermer une période
          </h3>
          <p className="text-xs text-gray-500">
            Les dates passées ou déjà réservées sont laissées intactes.
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-2">
        <RangeDateField
          id="du"
          label="Du"
          value={start}
          min={minDate}
          max={maxDate}
          busy={busy}
          onChange={onStartChange}
        />
        <span
          aria-hidden
          className="hidden pb-3 text-gray-400 sm:flex sm:items-center"
        >
          <ArrowRight className="h-4 w-4" />
        </span>
        <RangeDateField
          id="au"
          label="Au"
          value={end}
          min={minDate}
          max={maxDate}
          busy={busy}
          onChange={onEndChange}
        />

        <div className="flex flex-1 flex-col gap-1.5 sm:flex-none">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Action
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onApply(true)}
              disabled={applyDisabled}
              className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-md bg-secondary px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-secondary-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"
            >
              {busy ? (
                <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 aria-hidden className="h-4 w-4" />
              )}
              Ouvrir
            </button>
            <button
              type="button"
              onClick={() => onApply(false)}
              disabled={applyDisabled}
              className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-md border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700 shadow-xs transition-colors hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"
            >
              {busy ? (
                <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
              ) : (
                <Lock aria-hidden className="h-3.5 w-3.5" />
              )}
              Fermer
            </button>
          </div>
        </div>
      </div>

      {stats && (
        <p className="mt-2.5 text-xs text-gray-500">
          {formatNumber(stats.total)} jour{stats.total > 1 ? "s" : ""} dans la
          période
          {stats.inMonth > 0 &&
            ` · ${formatNumber(stats.inMonth)} dans ce mois, dont ${formatNumber(
              stats.openInMonth
            )} actuellement ouverte${stats.openInMonth > 1 ? "s" : ""}`}
        </p>
      )}

      {feedback && (
        <div
          role="status"
          className={cn(
            "mt-2.5 flex items-start gap-2 rounded-md border p-3 text-sm",
            feedback.tone === "success"
              ? "border-success/30 bg-success/5 text-gray-700"
              : "border-error/30 bg-error/5 text-gray-700"
          )}
        >
          {feedback.tone === "success" ? (
            <CheckCircle2
              aria-hidden
              className="mt-0.5 h-4 w-4 shrink-0 text-success"
            />
          ) : (
            <Lock aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-error" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}
    </div>
  );
}

function RangeDateField({
  id,
  label,
  value,
  min,
  max,
  busy,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  min: string;
  max: string;
  busy: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1.5 sm:flex-none">
      <label
        htmlFor={id}
        className="text-xs font-semibold uppercase tracking-wide text-gray-500"
      >
        {label}
      </label>
      <input
        id={id}
        type="date"
        value={value}
        min={min}
        max={max}
        disabled={busy}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 shadow-xs transition-colors focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 disabled:cursor-not-allowed disabled:opacity-50 sm:w-44"
      />
    </div>
  );
}

/** Pastille de comptage de l'en-tête, par état. */
function StatPill({
  tone,
  label,
}: {
  tone: "success" | "error" | "muted";
  label: string;
}) {
  const classes = {
    success: "border-success/30 bg-success/5 text-success",
    error: "border-error/30 bg-error/5 text-error",
    muted: "border-gray-200 bg-gray-50 text-gray-600",
  }[tone];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        classes
      )}
    >
      {label}
    </span>
  );
}

function DayCell({
  day,
  today,
  pending,
  onToggle,
}: {
  day: OwnerCalendarDay;
  today: string;
  pending: boolean;
  onToggle: () => void;
}) {
  const state = dayState(day);
  const meta = STATE_META[state];
  const editable = isDayEditable(day);
  const dayNumber = Number(day.date.slice(8, 10));
  const isToday = day.date === today;

  const description = [
    formatDate(day.date),
    isToday ? "aujourd'hui" : null,
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
        day.requested && "ring-1 ring-inset ring-warning/50",
        isToday && "ring-2 ring-accent/70 ring-offset-1"
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