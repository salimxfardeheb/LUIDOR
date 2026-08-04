import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AccountKpiGrid } from "@/components/account/AccountKpiGrid";
import { ProfileCard } from "@/components/account/ProfileCard";
import { Alert } from "@/components/ui/Alert";
import { PageHeader } from "@/components/ui/PageHeader";
import { auth } from "@/lib/auth";
import { getAccountKpis, getAccountProfile } from "@/lib/account/profile";
import { SIGN_IN_PATH } from "@/lib/roles";

// Route /profil — protégée : ouverte aux trois rôles, chacun ne voyant que son
// propre compte.
export const metadata: Metadata = { title: "Mon profil" };

export default async function Page() {
  const session = await auth();
  if (!session?.user?.id) redirect(`${SIGN_IN_PATH}?callbackUrl=/profil`);

  const [profile, kpis] = await Promise.all([
    getAccountProfile(session.user.id),
    getAccountKpis(session.user.id, session.user.role),
  ]);

  // Session valide mais compte supprimé entre-temps : on le dit plutôt que de
  // rendre une page vide.
  if (!profile) {
    return (
      <Alert variant="error" title="Compte introuvable">
        Ce compte n&apos;existe plus. Reconnectez-vous ou contactez le support.
      </Alert>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Mon profil"
        description="Les informations de votre compte LIUDOR et un résumé de votre activité."
      />

      <ProfileCard profile={profile} />

      <AccountKpiGrid kpis={kpis} />
    </div>
  );
}
