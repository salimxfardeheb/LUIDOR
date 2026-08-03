import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/ui/PagePlaceholder";

// Route /admin/blog — protégée, rôle ADMIN.
export const metadata: Metadata = { title: "Gestion du blog" };

export default function Page() {
  return (
    <PagePlaceholder
      title="Gestion du blog"
      description="Création, édition, publication et dépublication des articles du blog."
    />
  );
}
