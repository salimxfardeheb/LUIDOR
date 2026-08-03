import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/ui/PagePlaceholder";

// Route /profil — protégée, rôle CLIENT.
export const metadata: Metadata = { title: "Mon profil" };

export default function Page() {
  return (
    <PagePlaceholder
      title="Mon profil"
      description="Informations du compte : identité, email, téléphone et photo de profil."
    />
  );
}
