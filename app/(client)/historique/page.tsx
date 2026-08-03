import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/ui/PagePlaceholder";

// Route /historique — protégée, rôle CLIENT.
export const metadata: Metadata = { title: "Historique" };

export default function Page() {
  return (
    <PagePlaceholder
      title="Historique"
      description="Réservations passées ou clôturées, avec possibilité de laisser un avis sur la salle."
    />
  );
}
