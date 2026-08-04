import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PasswordForm } from "@/components/account/PasswordForm";
import { ProfileForm } from "@/components/account/ProfileForm";
import { Alert } from "@/components/ui/Alert";
import { PageHeader } from "@/components/ui/PageHeader";
import { auth } from "@/lib/auth";
import { getAccountProfile } from "@/lib/account/profile";
import { SIGN_IN_PATH } from "@/lib/roles";

// Route /profil/modifier — protégée : l'action serveur ne modifie jamais que le
// compte de la session, aucun identifiant ne transite par le formulaire.
export const metadata: Metadata = { title: "Modifier mon profil" };

export default async function Page() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect(`${SIGN_IN_PATH}?callbackUrl=/profil/modifier`);
  }

  const profile = await getAccountProfile(session.user.id);

  if (!profile) {
    return (
      <Alert variant="error" title="Compte introuvable">
        Ce compte n&apos;existe plus. Reconnectez-vous ou contactez le support.
      </Alert>
    );
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <Link
          href="/profil"
          className="inline-flex items-center gap-1.5 rounded-md text-sm font-medium text-gray-500 transition-colors hover:text-primary-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
        >
          <ArrowLeft aria-hidden className="h-4 w-4" />
          Retour au profil
        </Link>
      </div>

      <PageHeader
        title="Modifier mon profil"
        description="Vos informations personnelles et la sécurité de votre compte."
      />

      <ProfileForm profile={profile} />

      <PasswordForm hasPassword={profile.hasPassword} />
    </div>
  );
}
