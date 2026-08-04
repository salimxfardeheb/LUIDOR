import Link from "next/link";
import { Calendar, Mail, Phone, Pencil, ShieldCheck } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { formatDate } from "@/lib/format";
import type { AccountProfile } from "@/lib/account/profile";
import { ROLE_LABELS } from "@/lib/roles";

/**
 * Carte d'identité du compte : avatar, nom, rôle et coordonnées.
 *
 * Le rôle est présenté comme une information, pas comme un réglage : il ne se
 * change pas depuis l'espace compte.
 */
export function ProfileCard({ profile }: { profile: AccountProfile }) {
  const role = ROLE_LABELS[profile.role];

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-4 sm:items-start">
          <Avatar
            name={profile.fullName}
            src={profile.avatarUrl}
            role={profile.role}
            size="lg"
          />

          <div className="min-w-0">
            <h2 className="text-xl font-bold tracking-tight text-gray-900">
              {profile.fullName}
            </h2>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge variant="info">
                <ShieldCheck aria-hidden className="h-3.5 w-3.5" />
                {role.label}
              </Badge>
            </div>
            <p className="mt-2 text-sm text-gray-500">{role.description}</p>
          </div>
        </div>

        <Link href="/profil/modifier" className="shrink-0">
          <Button variant="outline" className="w-full sm:w-auto">
            <Pencil aria-hidden className="h-4 w-4" />
            Modifier mon profil
          </Button>
        </Link>
      </div>

      <dl className="mt-6 grid gap-4 border-t border-gray-100 pt-5 sm:grid-cols-2 lg:grid-cols-3">
        <InfoRow icon={<Mail aria-hidden className="h-4 w-4" />} label="Email">
          <a
            href={`mailto:${profile.email}`}
            className="break-all text-gray-700 transition-colors hover:text-primary-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
          >
            {profile.email}
          </a>
        </InfoRow>

        <InfoRow
          icon={<Phone aria-hidden className="h-4 w-4" />}
          label="Téléphone"
        >
          {profile.phone ? (
            <a
              href={`tel:${profile.phone.replace(/\s/g, "")}`}
              className="text-gray-700 transition-colors hover:text-primary-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
            >
              {profile.phone}
            </a>
          ) : (
            <span className="text-gray-400">Non renseigné</span>
          )}
        </InfoRow>

        <InfoRow
          icon={<Calendar aria-hidden className="h-4 w-4" />}
          label="Compte créé le"
        >
          <span className="text-gray-700">{formatDate(profile.createdAt)}</span>
        </InfoRow>
      </dl>
    </Card>
  );
}

function InfoRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <dt className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400">
        <span className="text-gray-400">{icon}</span>
        {label}
      </dt>
      <dd className="mt-1 text-sm">{children}</dd>
    </div>
  );
}
