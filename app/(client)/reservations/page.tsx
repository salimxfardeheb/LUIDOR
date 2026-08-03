import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/ui/PagePlaceholder";

// Route /reservations — protégée, rôle CLIENT.
export const metadata: Metadata = { title: "Mes réservations" };

export default function Page() {
  return (
    <PagePlaceholder
      title="Mes réservations"
      description="Réservations en cours avec leur statut (en attente, en cours de vérification, confirmée, annulée) et suivi du paiement."
    />
  );
}
