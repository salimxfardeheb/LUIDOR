import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/ui/PagePlaceholder";

// Route /admin/salles — protégée, rôle ADMIN.
export const metadata: Metadata = { title: "Validation des salles" };

export default function Page() {
  return (
    <PagePlaceholder
      title="Validation des salles"
      description="Salles soumises par les propriétaires : consultation du dossier, validation, rejet ou suspension."
    />
  );
}
