import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/ui/PagePlaceholder";

// Route /admin/calendrier — protégée, rôle ADMIN.
export const metadata: Metadata = { title: "Calendrier global" };

export default function Page() {
  return (
    <PagePlaceholder
      title="Calendrier global"
      description="Vue calendaire de toutes les réservations de la plateforme, salles et propriétaires confondus."
    />
  );
}
