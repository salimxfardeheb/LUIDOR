import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/ui/PagePlaceholder";

// Route /owner/salles/nouvelle — protégée, rôle OWNER.
export const metadata: Metadata = { title: "Ajouter une salle" };

export default function Page() {
  return (
    <PagePlaceholder
      title="Ajouter une salle"
      description="Formulaire de création d'une salle : description, localisation, capacité, tarif, photos, équipements et services."
    />
  );
}
