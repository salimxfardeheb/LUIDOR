import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/ui/PagePlaceholder";

// Route /admin/reservations — protégée, rôle ADMIN.
export const metadata: Metadata = { title: "Réservations" };

export default function Page() {
  return (
    <PagePlaceholder
      title="Réservations"
      description="Toutes les réservations de la plateforme, avec changement de statut et enregistrement des paiements en espèces."
    />
  );
}
