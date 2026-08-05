import { redirect } from "next/navigation";

// Route /admin/securite — entrée de menu de la colonne d'administration.
// La sécurité et les journaux sont une section de la page Paramètres : plutôt
// que d'en tenir deux versions, cette route y renvoie directement.
export default function Page() {
  redirect("/admin/parametres#securite");
}
