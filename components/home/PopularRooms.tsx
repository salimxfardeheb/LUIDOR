import Link from "next/link";
import { AlertTriangle, Building2 } from "lucide-react";
import { PopularRoomsGrid } from "@/components/home/PopularRoomsGrid";
import { RoomCardSkeleton } from "@/components/rooms/RoomCard";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Button } from "@/components/ui/Button";
import { DEMO_MODE } from "@/lib/demo";
import { getPopularRooms } from "@/lib/home/queries";

const HEADING_ID = "salles-populaires-titre";

function Section({ children }: { children: React.ReactNode }) {
  return (
    <section
      aria-labelledby={HEADING_ID}
      className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-20"
    >
      <SectionHeading
        id={HEADING_ID}
        title="Salles des fêtes populaires"
        description="Les salles les mieux notées par les clients qui y ont organisé leur événement."
        action={{ href: "/salles", label: "Voir toutes" }}
      />
      <div className="mt-8">{children}</div>
    </section>
  );
}

/** Section serveur : les 8 salles ACTIVE les mieux notées. */
export async function PopularRooms() {
  try {
    const rooms = await getPopularRooms();

    if (rooms.length === 0) {
      return (
        <Section>
          <EmptyState />
        </Section>
      );
    }

    return (
      <Section>
        <PopularRoomsGrid rooms={rooms} />
      </Section>
    );
  } catch (error) {
    console.error("[accueil] chargement des salles populaires", error);
    return (
      <Section>
        <ErrorState />
      </Section>
    );
  }
}

/** Fallback de `<Suspense>` pendant la requête Prisma. */
export function PopularRoomsSkeleton() {
  return (
    <Section>
      <div
        role="status"
        aria-label="Chargement des salles populaires"
        className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4"
      >
        {Array.from({ length: 4 }, (_, index) => (
          <RoomCardSkeleton key={index} />
        ))}
      </div>
    </Section>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center rounded-lg border border-dashed border-gray-300 bg-gray-50 px-6 py-14 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary/10">
        <Building2 aria-hidden className="h-6 w-6 text-secondary" />
      </span>
      <h3 className="mt-4 text-base font-semibold text-gray-900">
        Aucune salle publiée pour le moment
      </h3>
      {/* L'appel aux propriétaires mène à leur espace, coupé en mode démo. */}
      <p className="mt-2 max-w-md text-sm text-gray-500">
        Les premières salles arrivent bientôt.
        {!DEMO_MODE &&
          " Vous êtes propriétaire ? Publiez la vôtre et soyez parmi les premiers référencés sur LIUDOR."}
      </p>
      {!DEMO_MODE && (
        <Link href="/owner/salles/nouvelle" className="mt-6">
          <Button>Publier une salle</Button>
        </Link>
      )}
    </div>
  );
}

function ErrorState() {
  return (
    <div
      role="alert"
      className="flex flex-col items-center rounded-lg border border-error/30 bg-error/5 px-6 py-14 text-center"
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-error/10">
        <AlertTriangle aria-hidden className="h-6 w-6 text-error" />
      </span>
      <h3 className="mt-4 text-base font-semibold text-gray-900">
        Impossible de charger les salles
      </h3>
      <p className="mt-2 max-w-md text-sm text-gray-500">
        Le service est momentanément indisponible. Vous pouvez tout de même
        parcourir le catalogue complet.
      </p>
      <Link href="/salles" className="mt-6">
        <Button variant="outline">Voir le catalogue</Button>
      </Link>
    </div>
  );
}
