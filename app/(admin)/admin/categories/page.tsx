import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/ui/PagePlaceholder";

// Route /admin/categories — protégée, rôle ADMIN.
export const metadata: Metadata = { title: "Catégories de salles" };

export default function Page() {
  return (
    <PagePlaceholder
      title="Catégories de salles"
      description="Catégories d'événement proposées au catalogue : création, renommage et rattachement des salles."
    />
  );
}
