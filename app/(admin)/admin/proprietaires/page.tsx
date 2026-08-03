import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/ui/PagePlaceholder";

// Route /admin/proprietaires — protégée, rôle ADMIN.
export const metadata: Metadata = { title: "Propriétaires" };

export default function Page() {
  return (
    <PagePlaceholder
      title="Propriétaires"
      description="Gestion des comptes OWNER : salles rattachées, volume de réservations et statut du compte."
    />
  );
}
