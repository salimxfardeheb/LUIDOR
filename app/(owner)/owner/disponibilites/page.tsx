import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/ui/PagePlaceholder";

// Route /owner/disponibilites — protégée, rôle OWNER.
export const metadata: Metadata = { title: "Disponibilités" };

export default function Page() {
  return (
    <PagePlaceholder
      title="Disponibilités"
      description="Calendrier permettant d'ouvrir ou de bloquer des dates pour chacune des salles du propriétaire."
    />
  );
}
