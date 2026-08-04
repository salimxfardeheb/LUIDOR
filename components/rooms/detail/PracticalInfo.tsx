import {
  Accessibility,
  CalendarX,
  Clock,
  Music,
  PawPrint,
  Sparkles,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { CancellationTerms } from "@/components/rooms/detail/CancellationTerms";
import { formatPrice } from "@/lib/format";

interface InfoRow {
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
}

/**
 * Tableau « Informations pratiques » sur deux colonnes.
 *
 * Les conditions d'annulation sont un lien : le libellé court reste dans le
 * tableau, le texte intégral s'ouvre dans une modale plutôt que d'alourdir la
 * page. Une ligne dont la donnée n'est pas renseignée est masquée.
 */
export function PracticalInfo({
  openingHours,
  musicPolicy,
  cancellationPolicy,
  cancellationTerms,
  depositAmount,
  cleaningFee,
  petsAllowed,
  wheelchairAccess,
}: {
  openingHours: string | null;
  musicPolicy: string | null;
  cancellationPolicy: string | null;
  cancellationTerms: string | null;
  depositAmount: number | null;
  cleaningFee: number | null;
  petsAllowed: boolean;
  wheelchairAccess: boolean;
}) {
  const rows: InfoRow[] = [
    ...(openingHours
      ? [{ icon: Clock, label: "Horaires", value: openingHours }]
      : []),
    ...(musicPolicy
      ? [{ icon: Music, label: "Musique", value: musicPolicy }]
      : []),
    ...(cancellationPolicy
      ? [
          {
            icon: CalendarX,
            label: "Conditions d'annulation",
            value: (
              <CancellationTerms
                policy={cancellationPolicy}
                terms={cancellationTerms}
              />
            ),
          },
        ]
      : []),
    ...(depositAmount !== null
      ? [
          {
            icon: Wallet,
            label: "Caution",
            value: formatPrice(depositAmount),
          },
        ]
      : []),
    ...(cleaningFee !== null
      ? [
          {
            icon: Sparkles,
            label: "Frais de ménage",
            value: formatPrice(cleaningFee),
          },
        ]
      : []),
    {
      icon: PawPrint,
      label: "Animaux",
      value: petsAllowed ? "Acceptés" : "Non acceptés",
    },
    {
      icon: Accessibility,
      label: "Accès PMR",
      value: wheelchairAccess ? "Oui" : "Non",
    },
  ];

  return (
    <dl className="grid gap-x-8 gap-y-0 sm:grid-cols-2">
      {rows.map((row) => (
        <div
          key={row.label}
          className="flex items-start justify-between gap-4 border-b border-gray-200 py-3.5 last:border-b-0 sm:[&:nth-last-child(2)]:border-b-0"
        >
          <dt className="flex items-center gap-2 text-sm text-gray-500">
            <row.icon aria-hidden className="h-4 w-4 shrink-0 text-secondary" />
            {row.label}
          </dt>
          <dd className="text-right text-sm font-medium text-gray-900">
            {row.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
