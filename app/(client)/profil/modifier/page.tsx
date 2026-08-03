import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/ui/PagePlaceholder";

// Route /profil/modifier — protégée, rôle CLIENT.
export const metadata: Metadata = { title: "Modifier mon profil" };

export default function Page() {
  return (
    <PagePlaceholder
      title="Modifier mon profil"
      description="Formulaire d'édition des informations personnelles et changement de mot de passe."
    />
  );
}
