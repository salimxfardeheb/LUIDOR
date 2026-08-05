import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/ui/PagePlaceholder";

// Route /admin/verification — protégée, rôle ADMIN.
export const metadata: Metadata = { title: "Vérification des salles" };

export default function Page() {
  return (
    <PagePlaceholder
      title="Vérification des salles"
      description="Contrôle des salles avant mise en ligne : conformité du dossier, validation ou refus motivé."
    />
  );
}
