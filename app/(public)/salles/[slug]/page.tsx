import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AvailabilityCalendar } from "@/components/rooms/detail/AvailabilityCalendar";
import { BookingCard } from "@/components/rooms/detail/BookingCard";
import {
  ChipGrid,
  servicePriceLabel,
  type ChipItem,
} from "@/components/rooms/detail/ChipGrid";
import { LocationCard } from "@/components/rooms/detail/LocationCard";
import { OwnerCard } from "@/components/rooms/detail/OwnerCard";
import { PracticalInfo } from "@/components/rooms/detail/PracticalInfo";
import { RateTable } from "@/components/rooms/detail/RateTable";
import { RoomBreadcrumb } from "@/components/rooms/detail/RoomBreadcrumb";
import { RoomDescription } from "@/components/rooms/detail/RoomDescription";
import { RoomGallery } from "@/components/rooms/detail/RoomGallery";
import { RoomHeader } from "@/components/rooms/detail/RoomHeader";
import { RoomReviews } from "@/components/rooms/detail/RoomReviews";
import { RoomStats } from "@/components/rooms/detail/RoomStats";
import { RoomsGrid, RoomsGridSkeleton } from "@/components/rooms/RoomsGrid";
import { listEventTypes } from "@/lib/bookings/event-types";
import {
  getRoomCalendar,
  getRoomDetail,
  getSimilarRooms,
  SIMILAR_ROOMS_COUNT,
  type RoomDetail,
} from "@/lib/rooms/detail";
import { equipmentIcon, serviceIcon } from "@/lib/rooms/icons";
import { formatCapacity } from "@/lib/format";

// Route /salles/[slug] — fiche détaillée d'une salle publiée.
// Le segment est l'identifiant de la salle : c'est ce que produisent tous les
// liens de l'application (`/salles/<id>`), aucune colonne `slug` n'existe.

interface PageProps {
  params: { slug: string };
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const room = await getRoomDetail(params.slug);

  if (!room) return { title: "Salle introuvable" };

  return {
    title: `${room.name} — ${room.city}`,
    description: `${room.name} à ${room.city} : ${formatCapacity(
      room.capacityMin,
      room.capacityMax
    )}, ${room.categoryName.toLowerCase()}. Photos, équipements, avis vérifiés et disponibilités.`,
  };
}

export default async function Page({ params }: PageProps) {
  const room = await getRoomDetail(params.slug);

  // Salle inexistante, en attente de validation ou suspendue : 404.
  if (!room) notFound();

  // Types d'événement du formulaire de demande : la salle a sa catégorie, mais
  // on loue un lieu, pas un thème — un mariage se tient dans une salle rangée
  // en « Réception ».
  const eventTypes = await listEventTypes();

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-10">
      <RoomBreadcrumb
        city={room.city}
        district={room.district}
        roomName={room.name}
      />

      {/* Galerie et sidebar partagent la même ligne : la carte de réservation
          est visible sans défiler, alignée en haut de la photo principale. */}
      <div className="mt-5 grid gap-10 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-8">
        {/* Colonne principale */}
        <div className="min-w-0">
          <RoomGallery
            roomName={room.name}
            photos={room.photos}
            videoUrl={room.videoUrl}
          />

          <div className="mt-6">
            <RoomHeader
              name={room.name}
              categoryName={room.categoryName}
              verified={room.verified}
              rating={room.rating}
              reviewCount={room.reviewCount}
              city={room.city}
              district={room.district}
              address={room.address}
            />
          </div>

          <div className="mt-6">
            <RoomStats
              capacityMax={room.capacityMax}
              surfaceM2={room.surfaceM2}
              spacesCount={room.spacesCount}
              hasParking={room.hasParking}
              hasAccommodation={room.hasAccommodation}
            />
          </div>

          <Section title="À propos de cette salle">
            <RoomDescription description={room.description} />
          </Section>

          {/* Grille tarifaire avant les équipements : c'est la question qui
              vient juste après « à quoi ressemble la salle ». Absente tant que
              le propriétaire n'a saisi aucune formule. */}
          {room.rates.length > 0 && (
            <Section title="Tarifs et formules">
              <RateTable rates={room.rates} />
              <p className="mt-3 text-xs text-gray-500">
                Tarifs communiqués par le propriétaire, hors services
                optionnels. Le montant exact vous est confirmé à la validation
                de votre demande.
              </p>
            </Section>
          )}

          {room.equipments.length > 0 && (
            <Section title="Équipements">
              <ChipGrid items={equipmentChips(room.equipments)} />
            </Section>
          )}

          {room.services.length > 0 && (
            <Section title="Services proposés">
              <ChipGrid items={serviceChips(room.services)} />
            </Section>
          )}

          <Section title="Informations pratiques">
            <PracticalInfo
              openingHours={room.openingHours}
              musicPolicy={room.musicPolicy}
              cancellationPolicy={room.cancellationPolicy}
              cancellationTerms={room.cancellationTerms}
              depositAmount={room.depositAmount}
              cleaningFee={room.cleaningFee}
              petsAllowed={room.petsAllowed}
              wheelchairAccess={room.wheelchairAccess}
            />
          </Section>

          <Section title="Avis des clients" id="avis">
            <RoomReviews
              categoryName={room.categoryName}
              rating={room.rating}
              reviewCount={room.reviewCount}
              breakdown={room.ratingBreakdown}
              reviews={room.reviews}
            />
          </Section>
        </div>

        {/* Sidebar collante : réservation, propriétaire, calendrier, carte. */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="flex flex-col gap-5">
            <BookingCard
              roomId={room.id}
              roomName={room.name}
              basePrice={room.basePrice}
              capacityMin={room.capacityMin}
              capacityMax={room.capacityMax}
              eventTypes={eventTypes}
              defaultEventType={room.categoryName}
            />

            <OwnerCard owner={room.owner} />

            {/* Le calendrier n'est pas nécessaire au premier rendu de la fiche. */}
            <Suspense fallback={<CalendarSkeleton />}>
              <RoomCalendarSection roomId={room.id} />
            </Suspense>

            <LocationCard
              name={room.name}
              address={room.address}
              district={room.district}
              city={room.city}
              latitude={room.latitude}
              longitude={room.longitude}
            />
          </div>
        </aside>
      </div>

      <section
        aria-labelledby="salles-similaires-titre"
        className="mt-14 border-t border-gray-200 pt-10"
      >
        <h2
          id="salles-similaires-titre"
          className="text-xl font-bold tracking-tight text-gray-900 sm:text-2xl"
        >
          Salles similaires
        </h2>
        <p className="mt-2 text-sm text-gray-500">
          D&apos;autres salles pour un événement de type{" "}
          {room.categoryName.toLowerCase()}, à {room.city} et alentours.
        </p>

        <div className="mt-6">
          <Suspense
            fallback={
              <RoomsGridSkeleton
                count={SIMILAR_ROOMS_COUNT}
                label="Chargement des salles similaires"
              />
            }
          >
            <SimilarRoomsSection room={room} />
          </Suspense>
        </div>
      </section>
    </div>
  );
}

function Section({
  title,
  id,
  children,
}: {
  title: string;
  id?: string;
  children: React.ReactNode;
}) {
  const headingId = id ? `${id}-titre` : undefined;

  return (
    <section
      id={id}
      aria-labelledby={headingId}
      className="mt-10 scroll-mt-24 border-t border-gray-200 pt-8"
    >
      <h2
        id={headingId}
        className="text-lg font-semibold tracking-tight text-gray-900 sm:text-xl"
      >
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

async function RoomCalendarSection({ roomId }: { roomId: string }) {
  try {
    const months = await getRoomCalendar(roomId);
    return <AvailabilityCalendar months={months} />;
  } catch (error) {
    console.error("[fiche salle] chargement du calendrier", error);
    return null;
  }
}

async function SimilarRoomsSection({ room }: { room: RoomDetail }) {
  try {
    const rooms = await getSimilarRooms(room);

    if (rooms.length === 0) {
      return (
        <p className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-6 py-10 text-center text-sm text-gray-500">
          Aucune autre salle comparable n&apos;est publiée pour le moment.
        </p>
      );
    }

    return <RoomsGrid rooms={rooms} />;
  } catch (error) {
    console.error("[fiche salle] chargement des salles similaires", error);
    return null;
  }
}

function CalendarSkeleton() {
  return (
    <div
      role="status"
      aria-label="Chargement des disponibilités"
      className="h-72 animate-pulse rounded-lg border border-gray-200 bg-white shadow-sm"
    />
  );
}

function equipmentChips(equipments: RoomDetail["equipments"]): ChipItem[] {
  return equipments.map((equipment) => ({
    key: equipment.name,
    label: equipment.name,
    icon: equipmentIcon(equipment.name),
    // `?? undefined` : `ChipItem.detail` est optionnel, pas nullable.
    detail: equipment.detail ?? undefined,
  }));
}

function serviceChips(services: RoomDetail["services"]): ChipItem[] {
  return services.map((service) => ({
    key: service.id,
    label: service.name,
    icon: serviceIcon(service.name),
    detail: servicePriceLabel(service.price),
  }));
}
