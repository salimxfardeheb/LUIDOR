import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/ui/PagePlaceholder";

// Route /admin/avis — protégée, rôle ADMIN.
export const metadata: Metadata = { title: "Modération des avis" };

export default function Page() {
  return (
    <PagePlaceholder
      title="Modération des avis"
      description="Avis déposés par les clients : lecture, validation et suppression des contenus inappropriés."
    />
  );
}
