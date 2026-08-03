import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/ui/PagePlaceholder";

// Route /admin/dashboard — protégée, rôle ADMIN.
export const metadata: Metadata = { title: "Tableau de bord" };

export default function Page() {
  return (
    <PagePlaceholder
      title="Tableau de bord"
      description="KPI globaux de la plateforme (utilisateurs, salles, réservations, chiffre d'affaires) et activité récente."
    />
  );
}
