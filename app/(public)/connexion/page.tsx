import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AuthCard } from "@/components/auth/AuthCard";
import { LoginForm } from "@/components/auth/LoginForm";
import { resolveRedirect } from "@/lib/roles";

// Route /connexion — authentification par email / mot de passe.
export const metadata: Metadata = { title: "Connexion" };

export default async function Page({
  searchParams,
}: {
  searchParams: { callbackUrl?: string; error?: string };
}) {
  // `callbackUrl` et `error` sont posés par le middleware et par Auth.js.
  const session = await auth();
  if (session) {
    redirect(resolveRedirect(searchParams.callbackUrl, session.user.role));
  }

  return (
    <AuthCard
      title="Connexion"
      subtitle="Accédez à votre espace LIUDOR."
      footer={
        <>
          Pas encore de compte ?{" "}
          <Link
            href="/inscription"
            className="font-medium text-primary-900 underline underline-offset-4"
          >
            Créer un compte
          </Link>
        </>
      }
    >
      <LoginForm
        callbackUrl={searchParams.callbackUrl}
        initialError={searchParams.error}
      />
    </AuthCard>
  );
}
