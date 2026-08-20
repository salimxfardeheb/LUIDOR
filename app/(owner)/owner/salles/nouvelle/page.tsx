import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { RoomForm } from "@/components/owner/RoomForm";

// Route /owner/salles/nouvelle — protégée, rôle OWNER.
export const metadata: Metadata = { title: "Ajouter une salle" };

// Aucune donnée propre au propriétaire ici, et plus aucune lecture en base : les
// référentiels du formulaire sont tenus dans le code. La propriété est établie
// par l'action serveur à partir de la session, jamais d'un champ du formulaire.
export default function Page() {
  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/owner/salles"
        className="inline-flex items-center gap-1.5 rounded-md text-sm font-medium text-gray-500 transition-colors hover:text-primary-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2"
      >
        <ChevronLeft aria-hidden className="h-4 w-4" />
        Mes salles
      </Link>

      <header className="mt-4">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          Ajouter une salle
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Renseignez les informations de votre salle. Vous pourrez les modifier à
          tout moment, y compris après sa mise en ligne.
        </p>
      </header>

      <div className="mt-6">
        <RoomForm />
      </div>
    </div>
  );
}
