import Image from "next/image";
import Link from "next/link";
import { CalendarDays, MapPin, Users } from "lucide-react";
import { BookingStatusBadge } from "@/components/dashboard/BookingStatusBadge";
import { PhotoFallback } from "@/components/ui/PhotoFallback";
import { BOOKING_STATUS_MAP, paymentNote } from "@/lib/bookings/status";
import { formatDate, formatNumber, formatPrice } from "@/lib/format";
import type { AccountBooking } from "@/lib/account/bookings";

/**
 * Carte d'une réservation du compte : miniature de la salle, nom, date,
 * montant et badge de statut.
 *
 * Le `children` accueille une action propre à l'écran qui l'utilise —
 * l'historique y place le bouton « laisser un avis » — pour que la carte reste
 * la même partout sans connaître ces cas.
 */
export function BookingCard({
  booking,
  children,
}: {
  booking: AccountBooking;
  children?: React.ReactNode;
}) {
  return (
    <article className="flex flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md sm:flex-row">
      <div className="relative aspect-[16/9] w-full shrink-0 overflow-hidden bg-primary-900 sm:aspect-square sm:w-40">
        {booking.photoUrl ? (
          <Image
            src={booking.photoUrl}
            alt={`Salle ${booking.roomName}, ${booking.roomCity}`}
            fill
            sizes="(min-width: 640px) 160px, 100vw"
            className="object-cover"
          />
        ) : (
          <PhotoFallback />
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-3 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-base font-semibold leading-snug text-gray-900">
              <Link
                href={`/salles/${booking.roomId}`}
                className="rounded-md transition-colors hover:text-primary-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2"
              >
                {booking.roomName}
              </Link>
            </h3>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-500">
              <MapPin aria-hidden className="h-4 w-4 shrink-0 text-gray-400" />
              {booking.roomCity}
            </p>
          </div>

          <BookingStatusBadge status={booking.status} />
        </div>

        <dl className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <div>
            <dt className="sr-only">Date de l&apos;événement</dt>
            <dd className="flex items-center gap-1.5 text-gray-700">
              <CalendarDays
                aria-hidden
                className="h-4 w-4 shrink-0 text-gray-400"
              />
              {formatDate(booking.eventDate)}
            </dd>
          </div>

          <div>
            <dt className="sr-only">Invités</dt>
            <dd className="flex items-center gap-1.5 text-gray-700">
              <Users aria-hidden className="h-4 w-4 shrink-0 text-gray-400" />
              {formatNumber(booking.guestsCount)} invités
            </dd>
          </div>

          <div>
            <dt className="sr-only">Type d&apos;événement</dt>
            <dd className="text-gray-500">{booking.eventType}</dd>
          </div>
        </dl>

        <p className="text-sm text-gray-500">
          {BOOKING_STATUS_MAP[booking.status].description}
        </p>

        <div className="mt-auto flex flex-wrap items-end justify-between gap-3 border-t border-gray-100 pt-3">
          <p className="text-sm text-gray-500">
            Montant{" "}
            <span className="text-base font-bold text-secondary">
              {formatPrice(booking.amount)}
            </span>
            <span className="ml-1.5 text-xs text-gray-400">
              ({paymentNote(booking.paymentStatus)})
            </span>
          </p>

          {children}
        </div>
      </div>
    </article>
  );
}
