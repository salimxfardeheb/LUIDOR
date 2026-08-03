import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/ui/PagePlaceholder";

// Route /favoris — protégée, rôle CLIENT.
export const metadata: Metadata = { title: "Mes favoris" };

export default function Page() {
  return (
    <PagePlaceholder
      title="Mes favoris"
      description="Salles enregistrées par le client, avec accès direct à la fiche et à la demande de réservation."
    />
  );
}
