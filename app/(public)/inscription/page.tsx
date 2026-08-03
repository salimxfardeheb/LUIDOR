import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AuthCard } from "@/components/auth/AuthCard";
import { SignUpForm } from "@/components/auth/SignUpForm";
import { homePathForRole } from "@/lib/roles";

// Route /inscription — création d'un compte CLIENT ou OWNER.
export const metadata: Metadata = { title: "Inscription" };

export default async function Page() {
  const session = await auth();
  if (session) {
    redirect(homePathForRole(session.user.role));
  }

  return (
    <AuthCard
      title="Créer un compte"
      subtitle="Réservez une salle ou publiez la vôtre sur LIUDOR."
      footer={
        <>
          Vous avez déjà un compte ?{" "}
          <Link
            href="/connexion"
            className="font-medium text-primary-900 underline underline-offset-4"
          >
            Se connecter
          </Link>
        </>
      }
    >
      <SignUpForm />
    </AuthCard>
  );
}
