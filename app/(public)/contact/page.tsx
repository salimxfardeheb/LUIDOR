import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/ui/PagePlaceholder";

// Route /contact — formulaire de contact.
export const metadata: Metadata = { title: "Contact" };

export default function Page() {
  return (
    <PagePlaceholder
      title="Contact"
      description="Formulaire de contact, coordonnées et FAQ courte pour les clients comme pour les propriétaires."
    />
  );
}
