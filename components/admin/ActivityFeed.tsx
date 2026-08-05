import * as React from "react";
import {
  Banknote,
  Building2,
  CalendarCheck,
  History,
  Mail,
  Star,
  UserPlus,
  type LucideIcon,
} from "lucide-react";
import type { AdminActivityItem } from "@/lib/admin/dashboard";
import { formatDateTime, formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Icône et teinte de chaque type d'événement du fil. */
const KINDS: Record<
  AdminActivityItem["kind"],
  { icon: LucideIcon; className: string }
> = {
  room: { icon: Building2, className: "bg-secondary/15 text-secondary" },
  booking: { icon: CalendarCheck, className: "bg-accent/15 text-accent" },
  user: { icon: UserPlus, className: "bg-primary-900/10 text-primary-900" },
  review: { icon: Star, className: "bg-warning/15 text-warning" },
  payment: { icon: Banknote, className: "bg-success/15 text-success" },
  message: { icon: Mail, className: "bg-info/15 text-info" },
};

/**
 * Fil chronologique des dernières actions de la plateforme.
 *
 * Une seule liste, toutes sources confondues (salles, réservations, comptes,
 * avis, encaissements, messages) : c'est la lecture attendue d'un tableau de
 * bord — ce qui vient de se passer, dans l'ordre, sans avoir à ouvrir six
 * écrans.
 */
export function ActivityFeed({ items }: { items: AdminActivityItem[] }) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-10 text-center">
        <History aria-hidden className="h-8 w-8 text-gray-300" />
        <p className="text-sm text-gray-500">
          Aucune action enregistrée sur cette période.
        </p>
      </div>
    );
  }

  return (
    <ol className="flex flex-col">
      {items.map((item, index) => {
        const { icon: Icon, className } = KINDS[item.kind];
        const isLast = index === items.length - 1;

        return (
          <li key={item.id} className="flex gap-3">
            {/* Colonne de gauche : pastille + trait de liaison vers l'entrée suivante. */}
            <div className="flex flex-col items-center">
              <span
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                  className
                )}
              >
                <Icon aria-hidden className="h-4 w-4" />
              </span>
              {!isLast && <span aria-hidden className="w-px flex-1 bg-gray-200" />}
            </div>

            <div className={cn("min-w-0 flex-1", isLast ? "pb-0" : "pb-5")}>
              <p className="text-sm font-medium text-gray-900">{item.title}</p>
              <p className="mt-0.5 truncate text-sm text-gray-500">
                {item.detail}
              </p>
              <time
                dateTime={item.at}
                title={formatDateTime(item.at)}
                className="mt-1 block text-xs text-gray-400"
              >
                {formatRelativeTime(item.at)}
              </time>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
