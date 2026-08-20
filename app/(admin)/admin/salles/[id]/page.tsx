import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Accessibility,
  ArrowLeft,
  Ban,
  Banknote,
  BedDouble,
  CalendarCheck,
  Car,
  Check,
  Clock,
  ExternalLink,
  Heart,
  History,
  Images,
  MapPin,
  Maximize2,
  PawPrint,
  Ruler,
  ShieldCheck,
  Star,
  Users,
  Video,
  X,
  type LucideIcon,
} from "lucide-react";
import { requireAdminPage } from "@/lib/admin/guards";
import { getAdminRoomDetail, type AdminRoomDetail } from "@/lib/admin/rooms";
import {
  formatCapacity,
  formatDate,
  formatDateTime,
  formatNumber,
  formatPrice,
} from "@/lib/format";
import { equipmentIcon, serviceIcon } from "@/lib/rooms/icons";
import { RoomModerationActions } from "@/components/admin/RoomModerationActions";
import {
  ROOM_STATUS,
  RoomStatusBadge,
} from "@/components/owner/RoomStatusBadge";
import { ChipGrid, servicePriceLabel } from "@/components/rooms/detail/ChipGrid";
import { RateTable } from "@/components/rooms/detail/RateTable";
import { Alert } from "@/components/ui/Alert";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";

// Route /admin/salles/[id] — dossier complet d'une salle, protégée (ADMIN).
export const metadata: Metadata = { title: "Détail de la salle" };

const PATH = "/admin/salles";

/** Au-delà de ce délai, un dossier en attente est signalé comme trop lent. */
const OVERDUE_DAYS = 3;

interface PageProps {
  params: { id: string };
  searchParams: {
    /** Filtre de la file d'où l'on vient, restitué au retour. */
    proprietaire?: string;
  };
}

export default async function Page({ params, searchParams }: PageProps) {
  await requireAdminPage(`${PATH}/${params.id}`);

  const room = await getAdminRoomDetail(params.id);
  if (!room) notFound();

  // Le retour ramène la file dans l'état où elle était, filtre compris, et
  // remet en évidence le dossier que l'on vient de consulter.
  const backHref = searchParams.proprietaire
    ? `${PATH}?proprietaire=${encodeURIComponent(searchParams.proprietaire)}&salle=${room.id}`
    : `${PATH}?salle=${room.id}`;

  const lastDecision = room.moderations[0] ?? null;

  return (
    <div className="flex flex-col gap-6">
      <Link
        href={backHref}
        className="inline-flex items-center gap-1.5 self-start text-sm font-semibold text-secondary transition-colors hover:text-primary-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
      >
        <ArrowLeft aria-hidden className="h-4 w-4" />
        Retour à la file de validation
      </Link>

      <RoomHeader room={room} />

      <DecisionBar room={room} />

      {/*
        Un dossier refusé puis redéposé revient en attente avec le même écran
        qu'un dossier neuf : le motif précédent est rappelé pour éviter de
        réinstruire à l'aveugle.
      */}
      {room.status === "PENDING" && lastDecision?.action === "REJECTED" && (
        <Alert variant="warning" title="Dossier déjà refusé, puis redéposé">
          <span className="block italic">« {lastDecision.reason} »</span>
          <span className="mt-1 block text-xs text-gray-500">
            Refusé le {formatDate(lastDecision.at)}
            {lastDecision.adminName ? ` par ${lastDecision.adminName}` : ""}.
            Vérifiez que le point signalé a bien été corrigé avant de valider.
          </span>
        </Alert>
      )}

      {/* `min-w-0` sur les colonnes : sans lui, une adresse longue élargirait la
          colonne, donc la page entière. */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex min-w-0 flex-col gap-6 lg:col-span-2">
          <Offer room={room} />
          <Description room={room} />
          <Amenities room={room} />
          <PracticalTerms room={room} />
          <Gallery room={room} />
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          <OwnerCard room={room} />
          <ActivityCard room={room} />
          <ModerationTimeline room={room} />
        </div>
      </div>
    </div>
  );
}

/**
 * En-tête du dossier : identité et état, sans visuel.
 *
 * Les photos ont leur propre carte plus bas — les poser en fond du titre les
 * rendait décoratives, alors qu'elles sont la pièce à examiner.
 */
function RoomHeader({ room }: { room: AdminRoomDetail }) {
  return (
    <PageHeader
      title={room.name}
      description={
        <>
          <span className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
            <MapPin aria-hidden className="h-4 w-4 shrink-0 text-secondary" />
            {room.address}
            {room.district ? `, ${room.district}` : ""}, {room.city}
          </span>
          <span className="mt-1 block">
            Déposée le {formatDateTime(room.createdAt)} par{" "}
            {room.owner.fullName}
            {room.updatedAt !== room.createdAt
              ? `, modifiée le ${formatDateTime(room.updatedAt)}`
              : ""}
            .
          </span>
        </>
      }
    >
      <div className="flex flex-wrap gap-2 sm:justify-end">
        {room.verifiedAt && (
          <Badge variant="secondary">
            <ShieldCheck aria-hidden className="h-3 w-3" />
            Vérifiée
          </Badge>
        )}
        {room.status === "PENDING" && (
          <Badge
            variant={room.waitingDays >= OVERDUE_DAYS ? "warning" : "neutral"}
          >
            <Clock aria-hidden className="h-3 w-3" />
            {room.waitingDays === 0
              ? "Déposée aujourd'hui"
              : `${room.waitingDays} jour${room.waitingDays > 1 ? "s" : ""} d'attente`}
          </Badge>
        )}
        <RoomStatusBadge status={room.status} />
      </div>
    </PageHeader>
  );
}

/**
 * Barre de décision, collante en haut de la fenêtre.
 *
 * La page est longue et la décision se prend souvent après avoir tout parcouru :
 * les boutons doivent rester atteignables sans remonter.
 *
 * Ils ne s'affichent que sur un dossier en attente — `approveRoom` et
 * `rejectRoom` refusent tout autre statut, les montrer ailleurs ne promettrait
 * qu'une erreur.
 */
function DecisionBar({ room }: { room: AdminRoomDetail }) {
  return (
    // `top-14` sur mobile : l'en-tête de l'administration y est lui-même
    // collant (`top-0`, ~56 px de haut) et masquerait la barre.
    <div className="sticky top-14 z-20 md:top-4">
      <Card className="flex flex-col gap-4 border-gray-200 p-4 shadow-md sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span
            className={statusDotClass(room.status)}
            aria-hidden
          />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900">
              {ROOM_STATUS[room.status].label}
            </p>
            <p className="mt-0.5 text-sm text-gray-500">
              {room.status === "PENDING"
                ? "Ce dossier attend une décision. Une validation publie la salle immédiatement."
                : ROOM_STATUS[room.status].help}
            </p>
          </div>
        </div>

        <div className="shrink-0">
          {room.status === "PENDING" ? (
            <RoomModerationActions roomId={room.id} roomName={room.name} />
          ) : room.status === "ACTIVE" ? (
            <Link
              href={`/salles/${room.id}`}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-secondary transition-colors hover:text-primary-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
            >
              <ExternalLink aria-hidden className="h-4 w-4" />
              Voir la fiche publique
            </Link>
          ) : (
            // Une salle refusée ou désactivée n'a pas de fiche publique :
            // `getRoomDetail` ne sert que les salles `ACTIVE`.
            <p className="text-sm text-gray-400">Hors catalogue public</p>
          )}
        </div>
      </Card>
    </div>
  );
}

/** Pastille d'état, reprise des couleurs du badge de statut. */
function statusDotClass(status: AdminRoomDetail["status"]): string {
  const tones: Record<AdminRoomDetail["status"], string> = {
    PENDING: "bg-warning",
    ACTIVE: "bg-success",
    REJECTED: "bg-error",
    SUSPENDED: "bg-gray-400",
  };

  return `mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${tones[status]}`;
}

/** Ce que la salle propose : les deux chiffres qui décident, puis le reste. */
function Offer({ room }: { room: AdminRoomDetail }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>L&apos;offre</CardTitle>
        <CardDescription>
          Ce que le propriétaire met en avant sur sa fiche.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <Highlight
            icon={Banknote}
            label="Tarif de base"
            value={formatPrice(room.basePrice)}
            note="par jour"
          />
          <Highlight
            icon={Users}
            label="Capacité"
            value={formatCapacity(room.capacityMin, room.capacityMax)}
            note={
              room.capacityMin === null
                ? `${formatNumber(room.capacityMax)} invités au maximum`
                : `de ${formatNumber(room.capacityMin)} à ${formatNumber(room.capacityMax)} invités`
            }
          />
        </div>

        {/* Le tarif de base ne dit qu'un prix d'appel : c'est cette grille que
            le client comparera, elle mérite d'être relue avant validation. */}
        {room.rates.length > 0 && (
          <div>
            <SectionLabel>Grille tarifaire ({room.rates.length})</SectionLabel>
            <div className="mt-2">
              <RateTable rates={room.rates} />
            </div>
          </div>
        )}

        <div>
          <SectionLabel>Catégories</SectionLabel>
          <ul className="mt-2 flex flex-wrap gap-2">
            {room.categoryNames.map((name, index) => (
              <li key={name}>
                <Badge variant={index === 0 ? "secondary" : "neutral"}>
                  {name}
                  {index === 0 && (
                    <span className="font-normal opacity-70"> · principale</span>
                  )}
                </Badge>
              </li>
            ))}
          </ul>
        </div>

        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 border-t border-gray-100 pt-5 sm:grid-cols-3">
          {room.surfaceM2 !== null && (
            <Fact
              icon={Ruler}
              label="Superficie"
              value={`${formatNumber(room.surfaceM2)} m²`}
            />
          )}
          {room.spacesCount !== null && (
            <Fact
              icon={Maximize2}
              label="Espaces"
              value={formatNumber(room.spacesCount)}
            />
          )}
          <Fact
            icon={CalendarCheck}
            label="Déposée le"
            value={formatDate(room.createdAt)}
          />
          {room.updatedAt !== room.createdAt && (
            <Fact
              icon={Clock}
              label="Modifiée le"
              value={formatDate(room.updatedAt)}
            />
          )}
          <Fact
            icon={ShieldCheck}
            label="Vérification"
            value={
              room.verifiedAt
                ? `Le ${formatDate(room.verifiedAt)}`
                : "Non vérifiée"
            }
          />
        </dl>
      </CardContent>
    </Card>
  );
}

function Description({ room }: { room: AdminRoomDetail }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Description</CardTitle>
        <CardDescription>
          Le texte tel qu&apos;il paraîtra sur la fiche publique.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="whitespace-pre-line text-sm leading-relaxed text-gray-700">
          {room.description}
        </p>
      </CardContent>
    </Card>
  );
}

/**
 * Équipements et services, avec les mêmes chips que la fiche publique : ce que
 * l'administrateur voit ici est exactement ce que le client verra.
 */
function Amenities({ room }: { room: AdminRoomDetail }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Équipements et services</CardTitle>
        <CardDescription>
          Ce que le propriétaire annonce, avec les précisions qu&apos;il a
          saisies.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <section>
          <SectionLabel>Équipements ({room.equipments.length})</SectionLabel>
          <div className="mt-3">
            {room.equipments.length === 0 ? (
              <EmptyLine>Aucun équipement déclaré.</EmptyLine>
            ) : (
              <ChipGrid
                items={room.equipments.map((equipment) => ({
                  key: equipment.name,
                  label: equipment.name,
                  icon: equipmentIcon(equipment.name),
                  // `?? undefined` : `ChipItem.detail` est optionnel, pas nullable.
                  detail: equipment.detail ?? undefined,
                }))}
              />
            )}
          </div>
        </section>

        <section>
          <SectionLabel>Services proposés ({room.services.length})</SectionLabel>
          <div className="mt-3">
            {room.services.length === 0 ? (
              <EmptyLine>Aucun service proposé.</EmptyLine>
            ) : (
              <ChipGrid
                items={room.services.map((service) => ({
                  key: service.name,
                  label: service.name,
                  icon: serviceIcon(service.name),
                  detail: servicePriceLabel(service.price),
                }))}
              />
            )}
          </div>
        </section>
      </CardContent>
    </Card>
  );
}

/** Conditions pratiques et caractéristiques oui/non. */
function PracticalTerms({ room }: { room: AdminRoomDetail }) {
  const rows: { label: string; value: string }[] = [];

  if (room.openingHours) rows.push({ label: "Horaires", value: room.openingHours });
  if (room.musicPolicy)
    rows.push({ label: "Sonorisation", value: room.musicPolicy });
  if (room.cancellationPolicy)
    rows.push({ label: "Annulation", value: room.cancellationPolicy });
  if (room.depositAmount !== null)
    rows.push({ label: "Caution", value: formatPrice(room.depositAmount) });
  if (room.cleaningFee !== null)
    rows.push({ label: "Frais de ménage", value: formatPrice(room.cleaningFee) });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Informations pratiques</CardTitle>
        <CardDescription>
          Les conditions annoncées au client avant sa demande.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {rows.length === 0 ? (
          <EmptyLine>
            Aucune information pratique renseignée : la fiche publique masquera
            simplement ces lignes.
          </EmptyLine>
        ) : (
          <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
            {rows.map((row) => (
              <div key={row.label} className="min-w-0">
                <FactLabel>{row.label}</FactLabel>
                <dd className="mt-0.5 break-words text-sm text-gray-900">
                  {row.value}
                </dd>
              </div>
            ))}
          </dl>
        )}

        <ul className="flex flex-wrap gap-2 border-t border-gray-100 pt-5">
          <YesNo icon={Car} label="Parking" value={room.hasParking} />
          <YesNo
            icon={BedDouble}
            label="Hébergement"
            value={room.hasAccommodation}
          />
          <YesNo icon={PawPrint} label="Animaux" value={room.petsAllowed} />
          <YesNo
            icon={Accessibility}
            label="Accès PMR"
            value={room.wheelchairAccess}
          />
          <YesNo icon={Video} label="Visite vidéo" value={room.videoUrl !== null} />
        </ul>

        {room.cancellationTerms && (
          <details className="group rounded-md border border-gray-200 bg-gray-50 p-4">
            <summary className="cursor-pointer text-sm font-medium text-gray-900 marker:text-gray-400">
              Conditions d&apos;annulation complètes
            </summary>
            <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-gray-600">
              {room.cancellationTerms}
            </p>
          </details>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Galerie complète. Chaque photo ouvre l'original dans un nouvel onglet : la
 * vignette ne suffit pas pour juger d'un montage ou d'une image reprise
 * ailleurs.
 */
function Gallery({ room }: { room: AdminRoomDetail }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Photos{" "}
          <span className="font-normal text-gray-400">
            ({room.photos.length})
          </span>
        </CardTitle>
        <CardDescription>
          Dans l&apos;ordre choisi par le propriétaire, la première servant de
          visuel principal. Cliquez pour ouvrir l&apos;original en grand.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {room.photos.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <Images aria-hidden className="h-8 w-8 text-gray-300" />
            <p className="text-sm font-medium text-gray-900">
              Aucune photo fournie
            </p>
            <p className="max-w-sm text-sm text-gray-500">
              Une salle sans visuel ne reçoit pratiquement aucune demande :
              c&apos;est un motif de rejet recevable.
            </p>
          </div>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {room.photos.map((photo, index) => (
              <li key={photo}>
                <a
                  href={photo}
                  target="_blank"
                  rel="noreferrer"
                  className="group relative block aspect-[4/3] overflow-hidden rounded-md bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
                >
                  <Image
                    src={photo}
                    alt={`Photo ${index + 1} de ${room.name}`}
                    fill
                    sizes="(min-width: 640px) 220px, 45vw"
                    className="object-cover transition-transform duration-200 group-hover:scale-105"
                  />
                  {index === 0 && (
                    <span className="absolute left-2 top-2 rounded-full bg-primary-900/80 px-2 py-0.5 text-[11px] font-semibold text-white">
                      Principale
                    </span>
                  )}
                  <span className="absolute inset-0 flex items-center justify-center bg-primary-900/0 opacity-0 transition-all group-hover:bg-primary-900/40 group-hover:opacity-100">
                    <Maximize2 aria-hidden className="h-5 w-5 text-white" />
                  </span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function OwnerCard({ room }: { room: AdminRoomDetail }) {
  const { owner } = room;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Propriétaire</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <Avatar
            name={owner.fullName}
            src={owner.avatarUrl}
            role="OWNER"
            size="sm"
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-gray-900">
              {owner.fullName}
            </p>
            <a
              href={`mailto:${owner.email}`}
              className="block truncate text-xs text-gray-500 underline-offset-2 hover:underline"
            >
              {owner.email}
            </a>
          </div>
        </div>

        {owner.phone && (
          <p className="text-sm text-gray-700">{owner.phone}</p>
        )}

        <div className="flex flex-wrap gap-2">
          {owner.suspended && (
            <Badge variant="error">
              <Ban aria-hidden className="h-3 w-3" />
              Compte suspendu
            </Badge>
          )}
          <Badge variant="neutral">
            {owner.activeRoomsCount} salle
            {owner.activeRoomsCount > 1 ? "s" : ""} en ligne
          </Badge>
        </div>

        <div className="flex flex-col gap-1.5 border-t border-gray-100 pt-4 text-sm font-semibold text-secondary">
          <Link
            href={`/admin/proprietaires?q=${encodeURIComponent(owner.email)}`}
            className="transition-colors hover:text-primary-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
          >
            Voir le propriétaire
          </Link>
          <Link
            href={`${PATH}?proprietaire=${owner.id}`}
            className="transition-colors hover:text-primary-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
          >
            Ses autres dossiers
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

/** Ce que la salle porte déjà : une salle réservée ne se traite pas à la légère. */
function ActivityCard({ room }: { room: AdminRoomDetail }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Activité</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col gap-3">
          <Metric
            icon={CalendarCheck}
            label="Réservations"
            value={room.bookingsCount}
          />
          <Metric icon={Star} label="Avis" value={room.reviewsCount} />
          <Metric icon={Heart} label="Favoris" value={room.favoritesCount} />
          <Metric icon={Images} label="Photos" value={room.photos.length} />
        </ul>
      </CardContent>
    </Card>
  );
}

function ModerationTimeline({ room }: { room: AdminRoomDetail }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Historique</CardTitle>
        <CardDescription>
          Les décisions prises sur ce dossier, de la plus récente à la plus
          ancienne.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {room.moderations.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <History aria-hidden className="h-7 w-7 text-gray-300" />
            <p className="text-sm font-medium text-gray-900">
              Aucune décision enregistrée
            </p>
            <p className="text-sm text-gray-500">
              Ce dossier n&apos;a encore jamais été validé ni rejeté.
            </p>
          </div>
        ) : (
          <ol className="flex flex-col gap-4">
            {room.moderations.map((entry) => {
              const approved = entry.action === "APPROVED";

              return (
                <li key={entry.id} className="flex gap-3">
                  <span
                    aria-hidden
                    className={`mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                      approved
                        ? "bg-success/10 text-success"
                        : "bg-error/10 text-error"
                    }`}
                  >
                    {approved ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : (
                      <X className="h-3.5 w-3.5" />
                    )}
                  </span>

                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {approved ? "Validée" : "Rejetée"}
                      <span className="font-normal text-gray-500">
                        {" "}
                        · {entry.adminName ?? "Administrateur supprimé"}
                      </span>
                    </p>
                    <p className="text-xs text-gray-400">
                      <time dateTime={entry.at}>{formatDateTime(entry.at)}</time>
                    </p>
                    {entry.reason && (
                      <p className="mt-1.5 break-words text-sm italic text-gray-600">
                        « {entry.reason} »
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/*                            Briques d'affichage                             */
/* -------------------------------------------------------------------------- */

function Highlight({
  icon: Icon,
  label,
  value,
  note,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-secondary/20 text-primary-900">
        <Icon aria-hidden className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium text-gray-500">{label}</p>
        <p className="mt-0.5 break-words text-lg font-bold tracking-tight text-gray-900">
          {value}
        </p>
        <p className="text-xs text-gray-400">{note}</p>
      </div>
    </div>
  );
}

function Fact({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0">
      <FactLabel>{label}</FactLabel>
      <dd className="mt-0.5 flex items-center gap-1.5 text-sm text-gray-900">
        <Icon aria-hidden className="h-3.5 w-3.5 shrink-0 text-gray-400" />
        <span className="min-w-0 break-words">{value}</span>
      </dd>
    </div>
  );
}

const LABEL_CLASS = "text-xs font-semibold uppercase tracking-wider text-gray-400";

/** Libellé d'un terme de liste de définitions. */
function FactLabel({ children }: { children: React.ReactNode }) {
  return <dt className={LABEL_CLASS}>{children}</dt>;
}

/** Même libellé, hors d'une `<dl>` : un `<dt>` isolé n'est pas du HTML valide. */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className={LABEL_CLASS}>{children}</p>;
}

function YesNo({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: boolean;
}) {
  return (
    <li>
      <span
        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${
          value
            ? "border-success/30 bg-success/5 text-gray-700"
            : "border-gray-200 bg-white text-gray-400"
        }`}
      >
        <Icon
          aria-hidden
          className={`h-3.5 w-3.5 ${value ? "text-success" : "text-gray-300"}`}
        />
        {label}
        <span className="sr-only">{value ? " : oui" : " : non"}</span>
        {value ? (
          <Check aria-hidden className="h-3 w-3 text-success" />
        ) : (
          <X aria-hidden className="h-3 w-3 text-gray-300" />
        )}
      </span>
    </li>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
}) {
  return (
    <li className="flex items-center gap-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-gray-100 text-gray-500">
        <Icon aria-hidden className="h-4 w-4" />
      </span>
      <span className="flex-1 text-sm text-gray-600">{label}</span>
      <span className="text-sm font-bold tabular-nums text-gray-900">
        {formatNumber(value)}
      </span>
    </li>
  );
}

function EmptyLine({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-gray-500">{children}</p>;
}
