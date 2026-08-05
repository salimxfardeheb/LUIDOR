import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/ui/PagePlaceholder";

// Route /admin/annulations — protégée, rôle ADMIN.
export const metadata: Metadata = { title: "Annulations" };

export default function Page() {
  return (
    <PagePlaceholder
      title="Annulations"
      description="Réservations annulées : motif, salle concernée et suivi des remboursements en espèces."
    />
  );
}
