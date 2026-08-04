import Image from "next/image";
import Link from "next/link";
import { Clock, Languages, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { formatMonthYear } from "@/lib/format";
import type { RoomOwner } from "@/lib/rooms/detail";

/** Libellé du badge de compte, selon le rôle enregistré. */
const ACCOUNT_LABEL: Record<RoomOwner["role"], string> = {
  OWNER: "Propriétaire",
  ADMIN: "Équipe LIUDOR",
  CLIENT: "Compte client",
};

/** Carte propriétaire de la sidebar : identité, ancienneté et réactivité. */
export function OwnerCard({ owner }: { owner: RoomOwner }) {
  return (
    <section
      aria-labelledby="proprietaire-titre"
      className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm"
    >
      <h2
        id="proprietaire-titre"
        className="text-sm font-semibold text-gray-900"
      >
        Votre interlocuteur
      </h2>

      <div className="mt-4 flex items-center gap-3">
        {owner.avatarUrl ? (
          <Image
            src={owner.avatarUrl}
            alt=""
            width={48}
            height={48}
            className="h-12 w-12 shrink-0 rounded-full object-cover"
          />
        ) : (
          <span
            aria-hidden
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-900 text-base font-semibold text-white"
          >
            {owner.initials}
          </span>
        )}

        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-gray-900">
            {owner.fullName}
          </p>
          <span className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs font-medium text-gray-600">
            <ShieldCheck aria-hidden className="h-3.5 w-3.5 text-secondary" />
            {ACCOUNT_LABEL[owner.role]}
          </span>
        </div>
      </div>

      <dl className="mt-4 space-y-2.5 text-sm">
        <Row label="Membre depuis" value={formatMonthYear(owner.memberSince)} />
        {owner.responseTimeHours !== null && (
          <Row
            icon={Clock}
            label="Réponse moyenne"
            value={
              owner.responseTimeHours <= 1
                ? "moins d'une heure"
                : `environ ${owner.responseTimeHours} h`
            }
          />
        )}
        {owner.languages.length > 0 && (
          <Row
            icon={Languages}
            label="Langues parlées"
            value={owner.languages.join(", ")}
          />
        )}
      </dl>

      <Link href={`/proprietaires/${owner.id}`} className="mt-5 block">
        <Button variant="outline" className="w-full">
          Voir le profil
        </Button>
      </Link>
    </section>
  );
}

function Row({
  icon: Icon,
  label,
  value,
}: {
  icon?: typeof Clock;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="flex items-center gap-1.5 text-gray-500">
        {Icon && <Icon aria-hidden className="h-4 w-4 shrink-0 text-gray-400" />}
        {label}
      </dt>
      <dd className="text-right font-medium text-gray-900">{value}</dd>
    </div>
  );
}
