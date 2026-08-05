import { redirect } from "next/navigation";

// Route /admin/categories — entrée de menu de la colonne d'administration.
// Le CRUD des catégories vit avec les autres référentiels, dans la section
// « Catalogue » des paramètres : cette route y renvoie.
export default function Page() {
  redirect("/admin/parametres#catalogue");
}
