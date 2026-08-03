import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/ui/PagePlaceholder";

// Route /owner/reservations — protégée, rôle OWNER.
export const metadata: Metadata = { title: "Réservations reçues" };

export default function Page() {
  return (
    <PagePlaceholder
      title="Réservations reçues"
      description="Demandes de réservation reçues sur les salles du propriétaire, avec acceptation, refus et suivi du statut."
    />
  );
}
