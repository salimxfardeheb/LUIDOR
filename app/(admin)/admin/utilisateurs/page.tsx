import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/ui/PagePlaceholder";

// Route /admin/utilisateurs — protégée, rôle ADMIN.
export const metadata: Metadata = { title: "Utilisateurs" };

export default function Page() {
  return (
    <PagePlaceholder
      title="Utilisateurs"
      description="Gestion des comptes : recherche, consultation, changement de rôle et désactivation."
    />
  );
}
