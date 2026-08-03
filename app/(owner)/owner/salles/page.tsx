import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/ui/PagePlaceholder";

// Route /owner/salles — protégée, rôle OWNER.
export const metadata: Metadata = { title: "Mes salles" };

export default function Page() {
  return (
    <PagePlaceholder
      title="Mes salles"
      description="Liste des salles du propriétaire avec leur statut de validation (PENDING, ACTIVE, REJECTED, SUSPENDED)."
    />
  );
}
