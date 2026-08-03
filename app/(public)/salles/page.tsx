import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/ui/PagePlaceholder";

// Route /salles — catalogue général des salles.
export const metadata: Metadata = { title: "Catalogue des salles" };

export default function Page() {
  return (
    <PagePlaceholder
      title="Catalogue des salles"
      description="Liste complète des salles actives, avec filtres (ville, catégorie, capacité, budget) et pagination."
    />
  );
}
