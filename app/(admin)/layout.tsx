import { AdminSidebar } from "@/components/layout/AdminSidebar";

/**
 * Gabarit de l'administration : colonne fixe à gauche, contenu à droite.
 *
 * La colonne étant `fixed` à partir de `md`, le contenu compense sa largeur
 * avec `md:pl-64` — sans quoi il passerait dessous.
 */
export default function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-screen-safe bg-gray-50">
      <AdminSidebar />

      <div className="md:pl-64">
        <main className="mx-auto w-full max-w-[1600px] p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
