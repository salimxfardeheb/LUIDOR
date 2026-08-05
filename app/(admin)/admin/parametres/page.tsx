import type { Metadata } from "next";
import { KeyRound, ShieldAlert } from "lucide-react";
import { requireAdminPage } from "@/lib/admin/guards";
import { listAdminSignIns, listAuditLog } from "@/lib/admin/audit";
import { getCatalog } from "@/lib/admin/catalog";
import { getPlatformSettings } from "@/lib/admin/settings";
import { CatalogManager } from "@/components/admin/CatalogManager";
import { SecurityLogs } from "@/components/admin/SecurityLogs";
import { SettingsForm } from "@/components/admin/SettingsForm";
import { PasswordForm } from "@/components/account/PasswordForm";
import { Alert } from "@/components/ui/Alert";
import { PageHeader } from "@/components/ui/PageHeader";

// Route /admin/parametres — configuration de la plateforme, protégée (ADMIN).
export const metadata: Metadata = { title: "Paramètres" };

const SECTIONS = [
  { href: "#general", label: "Informations générales" },
  { href: "#catalogue", label: "Catalogue" },
  { href: "#securite", label: "Sécurité & Logs" },
];

export default async function Page() {
  await requireAdminPage("/admin/parametres");

  const [settings, catalog, signIns, actions] = await Promise.all([
    getPlatformSettings(),
    getCatalog(),
    listAdminSignIns(),
    listAuditLog(),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Paramètres"
        description="Configuration de la plateforme, référentiels du catalogue et surveillance de l'administration."
      />

      <nav aria-label="Sections des paramètres" className="flex flex-wrap gap-2">
        {SECTIONS.map((section) => (
          <a
            key={section.href}
            href={section.href}
            className="rounded-full border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 hover:text-primary-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
          >
            {section.label}
          </a>
        ))}
      </nav>

      <section
        id="general"
        aria-labelledby="titre-general"
        className="scroll-mt-6 flex flex-col gap-4"
      >
        <h2 id="titre-general" className="text-lg font-semibold text-gray-900">
          Informations générales
        </h2>
        <SettingsForm settings={settings} />
      </section>

      <section
        id="catalogue"
        aria-labelledby="titre-catalogue"
        className="scroll-mt-6 flex flex-col gap-4"
      >
        <div>
          <h2 id="titre-catalogue" className="text-lg font-semibold text-gray-900">
            Catalogue
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Référentiels partagés par toutes les salles. Une entrée rattachée à
            au moins une salle ne peut pas être supprimée.
          </p>
        </div>

        <div className="grid gap-6 xl:grid-cols-3">
          <CatalogManager
            kind="category"
            title="Catégories de salles"
            description="Types d'événement proposés au catalogue et aux filtres de recherche."
            items={catalog.categories}
            addLabel="Ajouter une catégorie"
          />
          <CatalogManager
            kind="equipment"
            title="Équipements"
            description="Ce qu'une salle met à disposition : sonorisation, climatisation, parking…"
            items={catalog.equipments}
            addLabel="Ajouter un équipement"
          />
          <CatalogManager
            kind="service"
            title="Services"
            description="Prestations facturées en supplément, avec leur tarif indicatif."
            items={catalog.services}
            addLabel="Ajouter un service"
          />
        </div>
      </section>

      <section
        id="securite"
        aria-labelledby="titre-securite"
        className="scroll-mt-6 flex flex-col gap-4"
      >
        <div>
          <h2 id="titre-securite" className="text-lg font-semibold text-gray-900">
            Sécurité &amp; Logs
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Traces des connexions et des décisions prises depuis
            l&apos;administration.
          </p>
        </div>

        <SecurityLogs signIns={signIns} actions={actions} />

        <div className="grid gap-6 xl:grid-cols-2">
          <div className="flex flex-col gap-4">
            <h3 className="flex items-center gap-2 text-base font-semibold text-gray-900">
              <KeyRound aria-hidden className="h-4 w-4 text-secondary" />
              Changer votre mot de passe
            </h3>
            <PasswordForm hasPassword />
          </div>

          <Alert variant="info" title="Ce que le journal ne couvre pas">
            Les sessions sont portées par un jeton signé valable 30 jours :
            changer votre mot de passe protège les connexions futures, mais ne
            ferme pas les sessions déjà ouvertes. En cas de compromission
            avérée, faites suspendre le compte depuis la gestion des
            utilisateurs.
            <span className="mt-2 flex items-center gap-1.5 text-xs text-gray-500">
              <ShieldAlert aria-hidden className="h-3.5 w-3.5" />
              Les adresses IP ne sont pas enregistrées.
            </span>
          </Alert>
        </div>
      </section>
    </div>
  );
}
