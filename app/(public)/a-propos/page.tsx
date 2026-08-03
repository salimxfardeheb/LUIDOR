import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/ui/PagePlaceholder";

// Route /a-propos — page institutionnelle.
export const metadata: Metadata = { title: "À propos" };

export default function Page() {
  return (
    <PagePlaceholder
      title="À propos"
      description="Présentation de LIUDOR : mission, valeurs, fonctionnement de la plateforme et équipe."
    />
  );
}
