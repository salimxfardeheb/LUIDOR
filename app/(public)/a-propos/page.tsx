import type { Metadata } from "next";

// Route /a-propos — page institutionnelle, contenu entièrement statique
// (lib/about/content.ts) : aucune requête, la page est prérendue au build.

const TITLE = "À propos";
const DESCRIPTION =
  "La mission de LIUDOR, son histoire et la charte de vérification appliquée à chaque salle des fêtes publiée sur la plateforme.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/a-propos" },
  openGraph: {
    type: "website",
    siteName: "LIUDOR",
    title: `${TITLE} | LIUDOR`,
    description: DESCRIPTION,
    url: "/a-propos",
  },
};

export default function Page() {
  return (
    <>
    </>
  );
}
