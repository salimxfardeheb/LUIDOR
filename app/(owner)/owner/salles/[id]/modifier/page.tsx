import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/ui/PagePlaceholder";

// Route /owner/salles/[id]/modifier — protégée, rôle OWNER.
export const metadata: Metadata = { title: "Modifier la salle" };

export default function Page({ params }: { params: { id: string } }) {
  return (
    <PagePlaceholder
      title="Modifier la salle"
      description={`Édition des informations, des photos, des équipements et des services de la salle. Salle ciblée : « ${params.id} ».`}
    />
  );
}
