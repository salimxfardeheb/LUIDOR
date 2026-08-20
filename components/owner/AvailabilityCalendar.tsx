"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarRange,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Info,
  Loader2,
  Lock,
  RotateCcw,
  XCircle,
} from "lucide-react";
import {
  setDateRangeAvailability,
  toggleDateAvailability,
  type SetRangeActionResult,
} from "@/actions/owner-availability";
import { Alert } from "@/components/ui/Alert";
import { Button, buttonVariants } from "@/components/ui/Button";
import { formatDate, formatMonthYear, formatNumber } from "@/lib/format";
import {
  buildAvailabilityHref,
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
 * `warning`, gris).
 *
 * Les cases restent volontairement compactes — une case de calendrier se lit
 * d'un coup d'œil, elle n'a pas à occuper la largeur de la page : la couleur
 * et la pastille portent l'état, le libellé complet vit dans la légende et
 * dans l'`aria-label` de chaque case.
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

/** Nombre de jours d'une période inclusive, ou `null` si le couple est invalide. */
function daysInPeriod(from: string, to: string): number | null {
  if (!from || !to || from > to) return null;
  const start = new Date(`${from}T00:00:00.000Z`);
  const end = new Date(`${to}T00:00:00.000Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  return Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
}

/** Ramène une date ISO dans la fenêtre gérable. */
function clampDate(value: string, min: string, max: string): string {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

/** Accord au pluriel des résumés (« 3 dates ouvertes »). */
function plural(count: number, word: string): string {
  return `${formatNumber(count)} ${word}${count > 1 ? "s" : ""}`;
}

interface AvailabilityCalendarProps {
  roomId: string;
  roomName: string;
  month: OwnerCalendarMonth;
  /**
   * Aujourd'hui et dernière date gérable, calculés par la page.
   *
   * Ces deux bornes viennent du serveur plutôt que d'un `new Date()` au rendu :
   * l'horloge du navigateur n'a pas à décider de ce qui est modifiable, et le
   * HTML hydraté correspond exactement à celui rendu côté serveur.
   */
  today: string;
  maxDate: string;
  /** `null` sur la première / dernière borne de la fenêtre gérable. */
  previousHref: string | null;
  nextHref: string | null;
}

/**
 * Calendrier mensuel d'une salle.
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
 */
export function AvailabilityCalendar({
  roomId,
  roomName,
  month,
  today,
  maxDate,
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

  /*
    Grille rendue par le serveur lors du dernier rendu pris en compte.
    Après un refus, l'action déclenche `router.refresh()` : le serveur renvoie
    une grille à jour, qu'il faut réellement afficher. Sans cette
    resynchronisation, l'état local resterait celui du premier rendu et la
    grille mentirait jusqu'au prochain changement de salle ou de mois.
    Ajustement pendant le rendu (et non dans un effet) : React relance le
    rendu immédiatement, sans affichage intermédiaire périmé.
  */
  const [serverDays, setServerDays] = React.useState(month.days);
  if (serverDays !== month.days) {
    setServerDays(month.days);
    setDays(month.days);
  }

  const minDate = today;
  const currentMonthKey = today.slice(0, 7);
  const isCurrentMonth = month.key === currentMonthKey;

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

  // Bornes du mois affiché, ramenées dans la fenêtre gérable : sur le mois
  // courant, la période part d'aujourd'hui et non du 1er, sinon le champ
  // afficherait une date que son propre attribut `min` interdit.
  const monthBounds = React.useMemo(() => {
    const first = `${month.year}-${String(month.month).padStart(2, "0")}-01`;
    const last = new Date(Date.UTC(month.year, month.month, 0))
      .toISOString()
      .slice(0, 10);
    return {
      start: clampDate(first, minDate, maxDate),
      end: clampDate(last, minDate, maxDate),
    };
  }, [month.year, month.month, minDate, maxDate]);

  const [rangeStart, setRangeStart] = React.useState(monthBounds.start);
  const [rangeEnd, setRangeEnd] = React.useState(monthBounds.end);
  /** Action de période en cours, pour n'animer que le bouton concerné. */
  const [rangeBusy, setRangeBusy] = React.useState<"open" | "close" | null>(
    null
  );
  const [rangeFeedback, setRangeFeedback] = React.useState<{
    tone: "success" | "error" | "info";
    message: string;
  } | null>(null);

  const rangeStats = React.useMemo(() => {
    const total = daysInPeriod(rangeStart, rangeEnd);
    if (total === null) return null;
    const inMonth = days.filter(
      (day) => day.date >= rangeStart && day.date <= rangeEnd
    );
    const openInMonth = inMonth.filter((day) => dayState(day) === "open").length;
    return { total, inMonth: inMonth.length, openInMonth };
  }, [days, rangeStart, rangeEnd]);

  // Une période invalide désactive les boutons : la raison est dite, plutôt
  // que laissée à deviner devant deux boutons éteints.
  const rangeError =
    rangeStats !== null
      ? null
      : !rangeStart || !rangeEnd
        ? "Renseignez les deux dates de la période."
        : "La date « Du » doit précéder la date « Au ».";

  const isDefaultRange =
    rangeStart === monthBounds.start && rangeEnd === monthBounds.end;

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
    if (rangeStats === null || rangeBusy) return;

    // Garde côté client avant d'appeler l'action : le serveur applique les
    // mêmes bornes, cette étape rend simplement le résumé fidèle à la période
    // réellement modifiée.
    const from = clampDate(rangeStart, minDate, maxDate);
    const to = clampDate(rangeEnd, minDate, maxDate);

    if (from > to) {
      setRangeFeedback({
        tone: "error",
        message: "Cette période est entièrement hors de la fenêtre gérable.",
      });
      return;
    }

    setRangeBusy(open ? "open" : "close");
    setRangeFeedback(null);

    const result = await setDateRangeAvailability(roomId, from, to, open);

    setRangeBusy(null);

    if (!result.ok) {
      setRangeFeedback({ tone: "error", message: result.message });
      // Un refus peut provenir d'une donnée périmée : on recharge la grille.
      router.refresh();
      return;
    }

    reflectRangeResult(result);

    // `opened` et `closed` s'excluent : une seule action est demandée à la
    // fois. Le résumé ne parle donc que du compteur concerné.
    const applied = open ? result.opened : result.closed;
    const verb = open ? "ouverte" : "fermée";

    if (applied === 0) {
      const message =
        result.skipped === 0
          ? "Aucun changement sur cette période."
          : result.skipped === 1
            ? `Aucun changement : cette date est déjà ${verb} ou verrouillée par une réservation.`
            : `Aucun changement : ces ${plural(result.skipped, "date")} sont déjà ${verb}s ou verrouillées par une réservation.`;
      setRangeFeedback({ tone: "info", message });
      setAnnouncement(message);
      router.refresh();
      return;
    }

    const message =
      result.skipped > 0
        ? `${plural(applied, "date")} ${verb}${applied > 1 ? "s" : ""} · ${plural(result.skipped, "date")} laissée${result.skipped > 1 ? "s" : ""} intacte${result.skipped > 1 ? "s" : ""}.`
        : `${plural(applied, "date")} ${verb}${applied > 1 ? "s" : ""}.`;

    setRangeFeedback({ tone: "success", message });
    setAnnouncement(message);
    router.refresh();
  }

  /** Repousse dans la grille affichée les dates de la période déjà visibles. */
  function reflectRangeResult(result: SetRangeActionResult & { ok: true }) {
    const appliedByDate = new Map(
      result.dates.map((item) => [item.date, item.status])
    );
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
      className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm"
    >
      <header className="flex flex-col gap-3 border-b border-gray-200 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:p-5">
        <div className="min-w-0">
          <h2
            id="calendrier-titre"
            className="truncate text-sm font-semibold text-gray-900"
          >
            {roomName}
          </h2>
          <p className="mt-0.5 text-xs text-gray-500">
            Dates gérables jusqu&apos;au {formatDate(maxDate)}
          </p>
        </div>

        <nav
          aria-label="Navigation par mois"
          className="flex items-center justify-between gap-1.5 sm:justify-end"
        >
          <MonthNavButton direction="prev" href={previousHref} />
          <p
            aria-live="polite"
            className="min-w-[8rem] text-center text-sm font-semibold capitalize text-gray-900"
          >
            {monthLabel}
          </p>
          <MonthNavButton direction="next" href={nextHref} />
          {!isCurrentMonth && (
            <Link
              href={buildAvailabilityHref(roomId, currentMonthKey)}
              scroll={false}
              className="ml-1 hidden h-8 items-center rounded-md px-2 text-xs font-semibold text-accent transition-colors hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 sm:inline-flex"
            >
              Aujourd&apos;hui
            </Link>
          )}
        </nav>
      </header>

      {/*
        Deux colonnes à partir de `lg` : la grille garde une largeur de
        calendrier — celle qu'on lit d'un coup d'œil — et la place restante
        sert aux actions plutôt qu'à étirer les cases.
      */}
      <div className="lg:grid lg:grid-cols-[21rem_minmax(0,1fr)]">
        <div className="border-b border-gray-200 p-4 sm:p-5 lg:border-b-0 lg:border-r">
          <div className="mx-auto max-w-[19.5rem]">
            <div className="grid grid-cols-7 gap-1">
              {WEEKDAY_INITIALS.map((weekday, index) => (
                <span
                  key={index}
                  aria-hidden
                  className="pb-1 text-center text-[10px] font-semibold uppercase tracking-wider text-gray-400"
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

            <ul className="mt-4 flex flex-wrap gap-x-3 gap-y-1.5 border-t border-gray-100 pt-3 text-[11px] text-gray-500">
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
          </div>
        </div>

        <div className="flex flex-col gap-4 p-4 sm:p-5">
          <dl className="grid grid-cols-3 gap-2">
            <CountCard tone="success" label="Ouvertes" value={counts.open} />
            <CountCard tone="error" label="Réservées" value={counts.booked} />
            <CountCard tone="muted" label="Fermées" value={counts.closed} />
          </dl>

          {error && (
            <Alert variant="error" title="Modification refusée">
              {error}
            </Alert>
          )}

          <RangePanel
            start={rangeStart}
            end={rangeEnd}
            minDate={minDate}
            maxDate={maxDate}
            busy={rangeBusy}
            stats={rangeStats}
            rangeError={rangeError}
            feedback={rangeFeedback}
            canReset={!isDefaultRange}
            monthLabel={monthLabel}
            onStartChange={(value) => {
              setRangeStart(value);
              setRangeFeedback(null);
            }}
            onEndChange={(value) => {
              setRangeEnd(value);
              setRangeFeedback(null);
            }}
            onReset={() => {
              setRangeStart(monthBounds.start);
              setRangeEnd(monthBounds.end);
              setRangeFeedback(null);
            }}
            onApply={applyRange}
          />

          <p className="mt-auto flex items-start gap-1.5 text-xs text-gray-400">
            <Lock aria-hidden className="mt-0.5 h-3 w-3 shrink-0" />
            Une date réservée est verrouillée : seul le support LIUDOR peut la
            libérer.
          </p>
        </div>
      </div>

      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
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
  rangeError,
  feedback,
  canReset,
  monthLabel,
  onStartChange,
  onEndChange,
  onReset,
  onApply,
}: {
  start: string;
  end: string;
  minDate: string;
  maxDate: string;
  busy: "open" | "close" | null;
  stats: { total: number; inMonth: number; openInMonth: number } | null;
  rangeError: string | null;
  feedback: { tone: "success" | "error" | "info"; message: string } | null;
  canReset: boolean;
  monthLabel: string;
  onStartChange: (value: string) => void;
  onEndChange: (value: string) => void;
  onReset: () => void;
  onApply: (open: boolean) => void;
}) {
  const applyDisabled = stats === null || busy !== null;

  return (
    <section
      aria-labelledby="periode-titre"
      className="rounded-lg border border-gray-200 bg-gray-50 p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white text-accent ring-1 ring-gray-200">
            <CalendarRange aria-hidden className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <h3
              id="periode-titre"
              className="text-sm font-semibold text-gray-900"
            >
              Ouvrir ou fermer une période
            </h3>
            <p className="text-xs text-gray-500">
              Les dates passées ou déjà réservées restent intactes.
            </p>
          </div>
        </div>

        {canReset && (
          <button
            type="button"
            onClick={onReset}
            title="Revenir aux bornes du mois affiché"
            aria-label={`Revenir aux bornes de ${monthLabel}`}
            className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-gray-500 transition-colors hover:bg-white hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
          >
            <RotateCcw aria-hidden className="h-3 w-3" />
            <span className="capitalize">{monthLabel}</span>
          </button>
        )}
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <RangeDateField
          id="du"
          label="Du"
          value={start}
          min={minDate}
          max={maxDate}
          busy={busy !== null}
          invalid={rangeError !== null}
          onChange={onStartChange}
        />
        <RangeDateField
          id="au"
          label="Au"
          value={end}
          min={minDate}
          max={maxDate}
          busy={busy !== null}
          invalid={rangeError !== null}
          onChange={onEndChange}
        />
      </div>

      {rangeError ? (
        <p id="periode-erreur" role="alert" className="mt-2 text-xs text-error">
          {rangeError}
        </p>
      ) : (
        stats && (
          <p className="mt-2 text-xs text-gray-500">
            {plural(stats.total, "jour")} dans la période
            {stats.inMonth > 0 &&
              ` · ${formatNumber(stats.inMonth)} sur ce mois, dont ${formatNumber(
                stats.openInMonth
              )} déjà ouverte${stats.openInMonth > 1 ? "s" : ""}`}
          </p>
        )
      )}

      {/* Boutons de la charte : or plein pour l'action qui publie des dates,
          contour pour celle qui les retire. */}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant="primary"
          onClick={() => onApply(true)}
          disabled={applyDisabled}
          className="font-semibold"
        >
          {busy === "open" ? (
            <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle2 aria-hidden className="h-4 w-4" />
          )}
          Ouvrir
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => onApply(false)}
          disabled={applyDisabled}
          className="bg-white font-semibold text-gray-700"
        >
          {busy === "close" ? (
            <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
          ) : (
            <Lock aria-hidden className="h-3.5 w-3.5" />
          )}
          Fermer
        </Button>
      </div>

      {feedback && <RangeFeedback {...feedback} />}
    </section>
  );
}

/** Retour de l'action de période : ce qui a réellement été appliqué. */
function RangeFeedback({
  tone,
  message,
}: {
  tone: "success" | "error" | "info";
  message: string;
}) {
  const meta = {
    success: { icon: CheckCircle2, box: "border-success/30 bg-success/5", icon_: "text-success" },
    error: { icon: XCircle, box: "border-error/30 bg-error/5", icon_: "text-error" },
    info: { icon: Info, box: "border-gray-200 bg-white", icon_: "text-gray-400" },
  }[tone];
  const Icon = meta.icon;

  return (
    <div
      role="status"
      className={cn(
        "mt-3 flex items-start gap-2 rounded-md border p-3 text-xs text-gray-700",
        meta.box
      )}
    >
      <Icon aria-hidden className={cn("mt-px h-4 w-4 shrink-0", meta.icon_)} />
      <span>{message}</span>
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
  invalid,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  min: string;
  max: string;
  busy: boolean;
  invalid: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
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
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? "periode-erreur" : undefined}
        onChange={(event) => onChange(event.target.value)}
        className={cn(
          "h-10 w-full rounded-md border bg-white px-3 text-sm text-gray-900 shadow-xs transition-colors",
          "focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
          "disabled:cursor-not-allowed disabled:opacity-50",
          invalid ? "border-error/60" : "border-gray-300"
        )}
      />
    </div>
  );
}

/** Compteur d'un état sur le mois affiché. */
function CountCard({
  tone,
  label,
  value,
}: {
  tone: "success" | "error" | "muted";
  label: string;
  value: number;
}) {
  const classes = {
    success: "border-success/30 bg-success/5 text-success",
    error: "border-error/30 bg-error/5 text-error",
    muted: "border-gray-200 bg-gray-50 text-gray-600",
  }[tone];

  return (
    <div className={cn("rounded-md border px-3 py-2", classes)}>
      <dt className="text-[11px] font-medium uppercase tracking-wide opacity-80">
        {label}
      </dt>
      <dd className="text-lg font-semibold leading-tight">
        {formatNumber(value)}
      </dd>
    </div>
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
    meta.label.toLowerCase(),
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
      // État de bascule pour les technologies d'assistance : une date ouverte
      // est un interrupteur enfoncé. Les dates verrouillées n'en sont pas un.
      aria-pressed={editable ? state === "open" : undefined}
      aria-busy={pending || undefined}
      aria-label={description}
      title={description}
      className={cn(
        "flex aspect-square flex-col items-center justify-center gap-0.5 rounded-md border",
        "text-xs transition-colors focus-visible:outline-none focus-visible:ring-2",
        "focus-visible:ring-accent/60 focus-visible:ring-offset-1",
        meta.cell,
        editable ? "cursor-pointer" : "cursor-not-allowed",
        // Une demande en instruction reste modifiable : elle est signalée, pas
        // verrouillée. Seule une réservation confirmée l'est.
        day.requested && "ring-1 ring-inset ring-warning/50",
        isToday && "ring-2 ring-accent/70 ring-offset-1"
      )}
    >
      <span className="flex items-center gap-0.5 font-medium leading-none">
        {dayNumber}
        {state === "booked" && (
          <Lock aria-hidden className="h-2.5 w-2.5 text-gray-400" />
        )}
      </span>

      {pending ? (
        <Loader2 aria-hidden className="h-2.5 w-2.5 animate-spin text-gray-500" />
      ) : (
        <span
          aria-hidden
          className={cn(
            "h-1.5 w-1.5 rounded-full",
            day.requested && editable ? "bg-warning" : meta.dot
          )}
        />
      )}
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
  // Même bouton que partout ailleurs sur le site, ramené au carré d'une icône.
  const className = cn(
    buttonVariants({ variant: "outline", size: "sm" }),
    "h-8 w-8 shrink-0 px-0 text-gray-600"
  );

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
