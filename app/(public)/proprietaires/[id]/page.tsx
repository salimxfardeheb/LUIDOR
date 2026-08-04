import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/ui/PagePlaceholder";

// Route /proprietaires/[id] — profil public d'un propriétaire, cible du bouton
// « Voir le profil » de la fiche salle.
export const metadata: Metadata = { title: "Profil du propriétaire" };

export default function Page({ params }: { params: { id: string } }) {
  return (
    <PagePlaceholder
      title="Profil du propriétaire"
      description={`Identité vérifiée, ancienneté, salles publiées et avis reçus. Propriétaire demandé : « ${params.id} ».`}
    />
  );
}
