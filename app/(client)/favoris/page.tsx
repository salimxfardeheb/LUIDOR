import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Heart } from "lucide-react";
import { FavoriteRoomCard } from "@/components/account/FavoriteRoomCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { ROOMS_GRID_CLASSES } from "@/components/rooms/RoomsGrid";
import { auth } from "@/lib/auth";
import { listFavoriteRooms } from "@/lib/account/favorites";
import { SIGN_IN_PATH } from "@/lib/roles";

// Route /favoris — protégée. Les favoris sont rattachés à l'utilisateur en
// base : la page ne peut afficher que ceux du compte connecté.
export const metadata: Metadata = { title: "Mes favoris" };

export default async function Page() {
  const session = await auth();
  if (!session?.user?.id) redirect(`${SIGN_IN_PATH}?callbackUrl=/favoris`);

  const favorites = await listFavoriteRooms(session.user.id);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Mes favoris"
        description={
          favorites.length === 0
            ? "Les salles que vous mettez de côté se retrouvent ici."
            : `${favorites.length} salle${favorites.length > 1 ? "s" : ""} enregistrée${favorites.length > 1 ? "s" : ""}, de la plus récemment ajoutée à la plus ancienne.`
        }
      />

      {favorites.length === 0 ? (
        <EmptyState
          icon={Heart}
          title="Aucun favori pour le moment"
          description="Parcourez le catalogue et touchez le cœur d'une salle pour la retrouver ici, prête à être réservée."
          action={{ href: "/salles", label: "Découvrir les salles" }}
        />
      ) : (
        // Grille identique à celle du catalogue : deux colonnes seulement, la
        // page compte déjà une colonne de navigation à gauche.
        <ul className={`${ROOMS_GRID_CLASSES} lg:grid-cols-3`}>
          {favorites.map((favorite) => (
            <li key={favorite.room.id}>
              <FavoriteRoomCard favorite={favorite} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
