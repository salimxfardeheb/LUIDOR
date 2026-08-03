import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/ui/PagePlaceholder";

// Route /owner/dashboard — protégée, rôle OWNER.
export const metadata: Metadata = { title: "Tableau de bord" };

export default function Page() {
  return (
    <PagePlaceholder
      title="Tableau de bord"
      description="Vue d'ensemble de l'activité du propriétaire : KPI (salles actives, réservations, revenus) et dernières demandes."
    />
  );
}
