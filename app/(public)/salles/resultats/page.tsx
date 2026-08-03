import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/ui/PagePlaceholder";

// Route /salles/resultats — résultats filtrés de la recherche.
export const metadata: Metadata = { title: "Résultats de recherche" };

export default function Page() {
  return (
    <PagePlaceholder
      title="Résultats de recherche"
      description="Salles correspondant aux critères envoyés depuis la barre de recherche (query params : ville, date, capacité, catégorie)."
    />
  );
}
