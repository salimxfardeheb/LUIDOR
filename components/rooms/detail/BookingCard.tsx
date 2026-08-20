"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  AlertCircle,
  BadgePercent,
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  Sparkles,
  Users,
} from "lucide-react";
import { checkRoomAvailability, type AvailabilityResult } from "@/actions/rooms";
import { BookingRequestModal } from "@/components/rooms/detail/BookingRequestModal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { formatNumber, formatPrice } from "@/lib/format";

/**
 * Carte de réservation de la sidebar.
 *
 * Deux actions, dans cet ordre : vérifier une disponibilité, puis déposer une
 * demande. Aucune des deux ne réserve quoi que ce soit — la demande part à
 * l'équipe LIUDOR (et non au propriétaire), qui rappelle le client pour
 * confirmer. Les textes ne doivent jamais laisser croire l'inverse.
 *
 * « Vérifier la disponibilité » interroge réellement la base via l'action
 * serveur `checkRoomAvailability` : elle croise les jours ouverts par le
 * propriétaire (`Availability`) et les réservations enregistrées par l'équipe
 * LIUDOR. Le résultat est affiché sous le formulaire, sans quitter la page et
 * sans rien enregistrer.
 */
export function BookingCard({
  roomId,
  roomName,
  basePrice,
  capacityMin,
  capacityMax,
  eventTypes,
  defaultEventType,
}: {
  roomId: string;
  roomName: string;
  basePrice: number;
  /** `null` quand la salle n'annonce pas de minimum. */
  capacityMin: number | null;
  capacityMax: number;
  /** Types d'événement proposés dans la demande (catégories de la plateforme). */
  eventTypes: string[];
  /** Catégorie de la salle, présélectionnée dans la demande. */
  defaultEventType: string;
}) {
  const router = useRouter();
  const { data: session, status } = useSession();

  const [pending, setPending] = React.useState(false);
  const [result, setResult] = React.useState<AvailabilityResult | null>(null);
  const [requestOpen, setRequestOpen] = React.useState(false);
  const [sentDate, setSentDate] = React.useState<string | null>(null);

  // La demande reprend ce qui est déjà saisi au-dessus : le visiteur n'a pas à
  // ressaisir sa date d'arrivée ni son nombre d'invités.
  const formRef = React.useRef<HTMLFormElement>(null);
  const [defaults, setDefaults] = React.useState({
    eventDate: "",
    guestsCount: "",
  });

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setResult(null);

    const formData = new FormData(event.currentTarget);
    formData.set("roomId", roomId);

    try {
      setResult(await checkRoomAvailability(formData));
    } catch (error) {
      console.error("[fiche salle] appel de vérification", error);
      setResult({
        ok: false,
        message: "La vérification a échoué. Réessayez dans un instant.",
      });
    } finally {
      setPending(false);
    }
  }

  /**
   * Réserver exige un compte : la demande est rattachée au client pour qu'il en
   * suive le statut depuis son espace. Un visiteur est envoyé vers /connexion,
   * qui le ramène sur cette fiche.
   */
  function handleRequest() {
    if (status !== "authenticated") {
      router.push(
        `/connexion?callbackUrl=${encodeURIComponent(`/salles/${roomId}`)}`
      );
      return;
    }

    const formData = new FormData(formRef.current ?? undefined);
    setDefaults({
      eventDate: String(formData.get("arrivee") ?? ""),
      guestsCount: String(formData.get("invites") ?? ""),
    });
    setRequestOpen(true);
  }

  return (
    <section
      aria-labelledby="reservation-titre"
      className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm"
    >
      <h2 id="reservation-titre" className="sr-only">
        Vérifier les disponibilités de {roomName} et déposer une demande de
        réservation
      </h2>

      {/* Prix */}
      <div className="flex flex-wrap items-end justify-between gap-2">
        <p>
          <span className="text-2xl font-bold text-gray-900">
            {formatPrice(basePrice)}
          </span>
          <span className="text-sm text-gray-500"> /jour</span>
        </p>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-secondary/30 bg-secondary/10 px-2.5 py-1 text-xs font-semibold text-secondary">
          <BadgePercent aria-hidden className="h-3.5 w-3.5" />
          Meilleur prix garanti
        </span>
      </div>
      <p className="mt-1 text-xs text-gray-500">Prix à partir de</p>

      <form
        ref={formRef}
        onSubmit={handleSubmit}
        className="mt-5 flex flex-col gap-3"
      >
        <div className="grid grid-cols-2 gap-3">
          <Field id="arrivee" label="Arrivée" icon={CalendarDays}>
            <Input id="arrivee" name="arrivee" type="date" required />
          </Field>
          <Field id="depart" label="Départ" icon={CalendarDays}>
            <Input id="depart" name="depart" type="date" required />
          </Field>
        </div>

        <Field id="invites" label="Invités" icon={Users}>
          <Input
            id="invites"
            name="invites"
            type="number"
            // Sans minimum annoncé, le plancher est celui du bon sens : un invité.
            min={capacityMin ?? 1}
            max={capacityMax}
            step={1}
            inputMode="numeric"
            placeholder={
              capacityMin === null
                ? `Jusqu'à ${capacityMax}`
                : `${capacityMin} – ${capacityMax}`
            }
            required
          />
        </Field>

        <Button
          type="submit"
          variant="outline"
          size="lg"
          className="mt-1 w-full"
          disabled={pending}
        >
          <CalendarCheck aria-hidden className="h-4 w-4" />
          {pending ? "Vérification…" : "Vérifier la disponibilité"}
        </Button>

        <Button
          type="button"
          size="lg"
          className="w-full"
          onClick={handleRequest}
          disabled={status === "loading"}
        >
          <Sparkles aria-hidden className="h-4 w-4" />
          Réserver chez nous
        </Button>

        <p className="text-xs leading-relaxed text-gray-500">
          Votre demande part à l&apos;équipe LIUDOR, pas au propriétaire : nous
          vous rappelons pour confirmer la date et le règlement. Rien
          n&apos;est retenu avant cet appel.
        </p>
      </form>

      {sentDate && (
        <Feedback tone="success" icon={CheckCircle2}>
          Demande envoyée pour le {sentDate}. L&apos;équipe LIUDOR vous contacte
          sous 24 h ouvrées pour la confirmer.
        </Feedback>
      )}

      {result && <ResultMessage result={result} capacityMax={capacityMax} />}

      <BookingRequestModal
        open={requestOpen}
        onClose={() => setRequestOpen(false)}
        onSent={setSentDate}
        roomId={roomId}
        roomName={roomName}
        capacityMin={capacityMin}
        capacityMax={capacityMax}
        eventTypes={eventTypes}
        defaults={{
          eventType: defaultEventType,
          eventDate: defaults.eventDate,
          guestsCount: defaults.guestsCount,
          email: session?.user?.email ?? "",
        }}
      />
    </section>
  );
}

function ResultMessage({
  result,
  capacityMax,
}: {
  result: AvailabilityResult;
  capacityMax: number;
}) {
  if (!result.ok) {
    return (
      <Feedback tone="error" icon={AlertCircle}>
        {result.message}
      </Feedback>
    );
  }

  if (result.available) {
    return (
      <Feedback tone="success" icon={CheckCircle2}>
        Salle a priori libre sur {result.days}{" "}
        {result.days > 1 ? "jours" : "jour"} — total estimé{" "}
        <strong className="font-semibold">{formatPrice(result.estimate)}</strong>{" "}
        (frais de ménage inclus, jusqu&apos;à {formatNumber(capacityMax)} invités).
        Déposez votre demande : nous vous rappelons pour la confirmer.
      </Feedback>
    );
  }

  const dates = result.unavailableDates;
  const shown = dates.slice(0, 3).join(", ");
  const extra = dates.length > 3 ? ` et ${dates.length - 3} autre(s)` : "";

  return (
    <Feedback tone="warning" icon={AlertCircle}>
      {result.reason === "occupied"
        ? `Indisponible le ${shown}${extra}. Essayez d'autres dates ou consultez le calendrier ci-dessous.`
        : `Le propriétaire n'a pas encore ouvert le ${shown}${extra} à la location. Envoyez tout de même votre demande : nous vérifions ces dates avec lui.`}
    </Feedback>
  );
}

const TONES = {
  success: "border-success/30 bg-success/5 text-gray-700 [&_svg]:text-success",
  warning: "border-warning/30 bg-warning/5 text-gray-700 [&_svg]:text-warning",
  error: "border-error/30 bg-error/5 text-gray-700 [&_svg]:text-error",
} as const;

function Feedback({
  tone,
  icon: Icon,
  children,
}: {
  tone: keyof typeof TONES;
  icon: typeof AlertCircle;
  children: React.ReactNode;
}) {
  return (
    <p
      role="status"
      className={`mt-4 flex items-start gap-2 rounded-md border p-3 text-sm ${TONES[tone]}`}
    >
      <Icon aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{children}</span>
    </p>
  );
}

function Field({
  id,
  label,
  icon: Icon,
  children,
}: {
  id: string;
  label: string;
  icon: typeof CalendarDays;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500"
      >
        <Icon aria-hidden className="h-3.5 w-3.5 text-secondary" />
        {label}
      </label>
      {children}
    </div>
  );
}
