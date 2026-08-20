import {
  Building2,
  CalendarCheck,
  CalendarClock,
  HandCoins,
  Heart,
  ShieldCheck,
  Star,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { formatNumber } from "@/lib/format";
import type { AccountKpi, AccountKpiKey } from "@/lib/account/profile";

/**
 * Icône par indicateur. Le langage visuel reste celui du tableau de bord
 * propriétaire — mêmes cartes, mêmes proportions — seuls les chiffres changent
 * selon le rôle.
 */
const ICONS: Record<AccountKpiKey, LucideIcon> = {
  bookings: CalendarClock,
  favorites: Heart,
  reviews: Star,
  publishedRooms: Building2,
  receivedBookings: CalendarCheck,
  receivedReviews: Star,
  roomsToApprove: ShieldCheck,
  bookingsToVerify: Wallet,
  cashToPayout: HandCoins,
};

/** Résumé chiffré du compte, en cartes KPI. */
export function AccountKpiGrid({ kpis }: { kpis: AccountKpi[] }) {
  return (
    <section
      aria-label="Résumé de votre compte"
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
    >
      {kpis.map((kpi) => (
        <KpiCard
          key={kpi.key}
          icon={ICONS[kpi.key]}
          label={kpi.label}
          value={formatNumber(kpi.value)}
          note={kpi.note}
        />
      ))}
    </section>
  );
}
