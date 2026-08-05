import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/ui/PagePlaceholder";

// Route /admin/demandes — protégée, rôle ADMIN.
export const metadata: Metadata = { title: "Demandes d'inscription" };

export default function Page() {
  return (
    <PagePlaceholder
      title="Demandes d'inscription"
      description="Dossiers déposés par les propriétaires : consultation des informations, des photos et suivi du traitement."
    />
  );
}
