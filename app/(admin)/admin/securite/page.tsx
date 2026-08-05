import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/ui/PagePlaceholder";

// Route /admin/securite — protégée, rôle ADMIN.
export const metadata: Metadata = { title: "Sécurité & Logs" };

export default function Page() {
  return (
    <PagePlaceholder
      title="Sécurité & Logs"
      description="Journal des connexions et des actions sensibles réalisées depuis l'administration."
    />
  );
}
