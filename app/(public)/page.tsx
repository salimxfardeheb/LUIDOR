import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/ui/PagePlaceholder";

// Route / — page d'entrée du site public.
export const metadata: Metadata = { title: "Accueil" };

export default function Page() {
  return (
    <PagePlaceholder
      title="Accueil"
      description="Hero de présentation, barre de recherche de salles et sections vitrine (catégories, salles mises en avant, témoignages)."
    />
  );
}
