import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/ui/PagePlaceholder";

// Route /admin/parametres — protégée, rôle ADMIN.
export const metadata: Metadata = { title: "Paramètres" };

export default function Page() {
  return (
    <PagePlaceholder
      title="Paramètres"
      description="Paramètres généraux de la plateforme (catégories, équipements, services) et réglages de sécurité."
    />
  );
}
