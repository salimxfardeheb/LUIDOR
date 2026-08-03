import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/ui/PagePlaceholder";

// Route /salles/[slug] — fiche détaillée d'une salle.
export const metadata: Metadata = { title: "Détail de la salle" };

export default function Page({ params }: { params: { slug: string } }) {
  return (
    <PagePlaceholder
      title="Détail de la salle"
      description={`Galerie photos, description, équipements, services, avis et formulaire de demande de réservation. Salle demandée : « ${params.slug} ».`}
    />
  );
}
