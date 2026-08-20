import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  CalendarCheck,
  Mail,
  MapPin,
  Phone,
  Users,
} from "lucide-react";
import { requireAdminPage } from "@/lib/admin/guards";
import { getAdminBookingDetail, listAdminOptions } from "@/lib/admin/bookings";
import { ADMIN_BOOKINGS_PATH } from "@/lib/admin/bookings-params";
import {
  formatCapacity,
  formatDate,
  formatDateTime,
  formatNumber,
  formatPrice,
} from "@/lib/format";
import { AccountStatusBadge } from "@/components/admin/AccountBadges";
import { BookingDecisionActions } from "@/components/admin/BookingDecisionActions";
import { CashMovementActions } from "@/components/admin/CashMovementActions";
import { PaymentTimeline } from "@/components/admin/PaymentTimeline";
import { RoomThumbnail } from "@/components/admin/RoomThumbnail";
import { UserSuspendButton } from "@/components/admin/UserSuspendButton";
import { BookingStatusBadge } from "@/components/dashboard/BookingStatusBadge";
import { Avatar } from "@/components/ui/Avatar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";

// Route /admin/reservations/[id] — dossier complet d'une réservation,
// protégée (ADMIN).
export const metadata: Metadata = { title: "Détail de la réservation" };

interface PageProps {
  params: { id: string };
}

export default async function Page({ params }: PageProps) {
  const session = await requireAdminPage(`${ADMIN_BOOKINGS_PATH}/${params.id}`);

  const [booking, admins] = await Promise.all([
    getAdminBookingDetail(params.id),
    listAdminOptions(),
  ]);

  if (!booking) notFound();

  const { client, owner, room, payment } = booking;

  return (
    <div className="flex flex-col gap-6">
      <Link
        href={ADMIN_BOOKINGS_PATH}
        className="inline-flex items-center gap-1.5 self-start text-sm font-semibold text-secondary transition-colors hover:text-primary-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
      >
        <ArrowLeft aria-hidden className="h-4 w-4" />
        Retour aux réservations
      </Link>

      <PageHeader
        title={`${booking.eventType} — ${formatDate(booking.eventDate)}`}
        description={`Demande déposée le ${formatDateTime(booking.createdAt)} par ${client.fullName}, sur ${room.name}.`}
      >
        <div className="flex flex-col items-end gap-3">
          <BookingStatusBadge status={booking.status} />
          <BookingDecisionActions
            bookingId={booking.id}
            clientName={client.fullName}
            status={booking.status}
          />
        </div>
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Détail de la réservation</CardTitle>
              <CardDescription>
                Ce que le client a demandé, et les coordonnées laissées avec la
                demande.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-6">
              <div className="flex flex-wrap items-start gap-4">
                <RoomThumbnail src={room.photoUrl} className="h-16 w-24" />
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/salles/${room.id}`}
                    className="font-semibold text-gray-900 underline-offset-2 hover:underline"
                  >
                    {room.name}
                  </Link>
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-500">
                    <MapPin aria-hidden className="h-4 w-4 shrink-0" />
                    <span className="min-w-0 truncate">
                      {room.address}, {room.district ? `${room.district}, ` : ""}
                      {room.city}
                    </span>
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    {room.categoryName} ·{" "}
                    {formatCapacity(room.capacityMin, room.capacityMax)}
                  </p>
                </div>
              </div>

              <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
                <DetailRow label="Type d'événement" value={booking.eventType} />
                <DetailRow
                  label="Date de l'événement"
                  value={formatDate(booking.eventDate)}
                />
                <DetailRow
                  label="Invités annoncés"
                  value={`${formatNumber(booking.guestsCount)} personnes`}
                  icon={<Users aria-hidden className="h-4 w-4" />}
                />
                <DetailRow
                  label="Tarif de la salle"
                  value={`${formatPrice(room.basePrice)}${
                    room.cleaningFee
                      ? ` + ${formatPrice(room.cleaningFee)} de ménage`
                      : ""
                  }`}
                />
                <DetailRow
                  label="Téléphone de contact"
                  value={
                    <a
                      href={`tel:${booking.contactPhone}`}
                      className="underline-offset-2 hover:underline"
                    >
                      {booking.contactPhone}
                    </a>
                  }
                  icon={<Phone aria-hidden className="h-4 w-4" />}
                />
                <DetailRow
                  label="Email de contact"
                  value={
                    <a
                      href={`mailto:${booking.contactEmail}`}
                      className="underline-offset-2 hover:underline"
                    >
                      {booking.contactEmail}
                    </a>
                  }
                  icon={<Mail aria-hidden className="h-4 w-4" />}
                />
                <DetailRow
                  label="Demande déposée le"
                  value={formatDateTime(booking.createdAt)}
                />
                <DetailRow
                  label="Dernière mise à jour"
                  value={formatDateTime(booking.updatedAt)}
                />
                {room.depositAmount != null && (
                  <DetailRow
                    label="Caution demandée"
                    value={formatPrice(room.depositAmount)}
                  />
                )}
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Suivi du paiement</CardTitle>
              <CardDescription>
                Tout se règle en espèces : le client remet la somme à LIUDOR, qui
                la reverse ensuite au propriétaire.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-6">
              <PaymentTimeline
                payment={payment}
                expectedAmount={booking.expectedAmount}
                clientName={client.fullName}
                ownerName={owner.fullName}
              />
              <CashMovementActions
                bookingId={booking.id}
                clientName={client.fullName}
                roomName={room.name}
                ownerName={owner.fullName}
                bookingStatus={booking.status}
                expectedAmount={booking.expectedAmount}
                payment={payment}
                admins={admins}
                currentAdminId={session.adminId}
                className="items-start sm:items-end"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Autres réservations de ce client</CardTitle>
              <CardDescription>
                {booking.clientHistory.length === 0
                  ? "C'est sa première demande sur LIUDOR."
                  : `${booking.clientHistory.length} autre${
                      booking.clientHistory.length > 1 ? "s" : ""
                    } réservation${
                      booking.clientHistory.length > 1 ? "s" : ""
                    } à son nom.`}
              </CardDescription>
            </CardHeader>
            {booking.clientHistory.length > 0 && (
              <CardContent>
                <ul className="divide-y divide-gray-100">
                  {booking.clientHistory.map((entry) => (
                    <li
                      key={entry.id}
                      className="flex flex-wrap items-center justify-between gap-3 py-3"
                    >
                      <div className="min-w-0">
                        <Link
                          href={`/admin/reservations/${entry.id}`}
                          className="block truncate text-sm font-medium text-gray-900 underline-offset-2 hover:underline"
                        >
                          {entry.roomName}
                        </Link>
                        <span className="text-xs text-gray-400">
                          {formatDate(entry.eventDate)}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold tabular-nums text-gray-900">
                          {formatPrice(entry.amount)}
                        </span>
                        <BookingStatusBadge status={entry.status} />
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            )}
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Détail du client</CardTitle>
              <CardDescription>
                Le compte à l&apos;origine de la demande.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <Avatar
                  name={client.fullName}
                  src={client.avatarUrl}
                  role="CLIENT"
                  size="md"
                />
                <div className="min-w-0">
                  <p className="truncate font-semibold text-gray-900">
                    {client.fullName}
                  </p>
                  <AccountStatusBadge suspended={client.suspended} />
                </div>
              </div>

              <dl className="flex flex-col gap-3">
                <DetailRow
                  label="Email du compte"
                  value={
                    <a
                      href={`mailto:${client.email}`}
                      className="underline-offset-2 hover:underline"
                    >
                      {client.email}
                    </a>
                  }
                />
                <DetailRow
                  label="Téléphone du compte"
                  value={
                    client.phone ? (
                      <a
                        href={`tel:${client.phone}`}
                        className="underline-offset-2 hover:underline"
                      >
                        {client.phone}
                      </a>
                    ) : (
                      "Non renseigné"
                    )
                  }
                />
                <DetailRow
                  label="Inscrit le"
                  value={formatDate(client.createdAt)}
                />
                <DetailRow
                  label="Réservations"
                  value={`${formatNumber(client.bookingsCount)} dont ${formatNumber(
                    client.confirmedBookingsCount
                  )} confirmée${client.confirmedBookingsCount > 1 ? "s" : ""}`}
                />
                <DetailRow
                  label="Total encaissé auprès de lui"
                  value={formatPrice(client.paidTotal)}
                />
              </dl>

              <div className="flex flex-col gap-2 border-t border-gray-100 pt-4">
                <Link
                  href={`/admin/reservations?q=${encodeURIComponent(client.email)}`}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-secondary transition-colors hover:text-primary-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
                >
                  <CalendarCheck aria-hidden className="h-4 w-4" />
                  Toutes ses réservations
                </Link>
                <UserSuspendButton
                  userId={client.id}
                  fullName={client.fullName}
                  suspended={client.suspended}
                  bookingsCount={client.bookingsCount}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Propriétaire de la salle</CardTitle>
              <CardDescription>
                C&apos;est à lui que revient la somme encaissée.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <Avatar
                  name={owner.fullName}
                  src={owner.avatarUrl}
                  role="OWNER"
                  size="md"
                />
                <div className="min-w-0">
                  <p className="truncate font-semibold text-gray-900">
                    {owner.fullName}
                  </p>
                  <AccountStatusBadge suspended={owner.suspended} />
                </div>
              </div>

              <dl className="flex flex-col gap-3">
                <DetailRow
                  label="Email"
                  value={
                    <a
                      href={`mailto:${owner.email}`}
                      className="underline-offset-2 hover:underline"
                    >
                      {owner.email}
                    </a>
                  }
                />
                <DetailRow
                  label="Téléphone"
                  value={
                    owner.phone ? (
                      <a
                        href={`tel:${owner.phone}`}
                        className="underline-offset-2 hover:underline"
                      >
                        {owner.phone}
                      </a>
                    ) : (
                      "Non renseigné"
                    )
                  }
                />
                <DetailRow
                  label="Salles en ligne"
                  value={formatNumber(owner.activeRoomsCount)}
                />
              </dl>

              <div className="flex flex-col gap-2 border-t border-gray-100 pt-4">
                <Link
                  href={`/admin/proprietaires?q=${encodeURIComponent(owner.email)}`}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-secondary transition-colors hover:text-primary-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
                >
                  <Building2 aria-hidden className="h-4 w-4" />
                  Voir sa fiche propriétaire
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

/** Ligne d'un bloc de détail : intitulé au-dessus, valeur en dessous. */
function DetailRow({
  label,
  value,
  icon,
}: {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-semibold uppercase tracking-wide text-gray-400">
        {label}
      </dt>
      <dd className="mt-0.5 flex items-center gap-1.5 text-sm text-gray-900">
        {icon && <span className="shrink-0 text-gray-400">{icon}</span>}
        <span className="min-w-0 break-words">{value}</span>
      </dd>
    </div>
  );
}
