import type { Metadata } from "next";
import Link from "next/link";
import { Banknote, Coins, HandCoins, RotateCcw, Wallet } from "lucide-react";
import { requireAdminPage } from "@/lib/admin/guards";
import { listAdminOptions } from "@/lib/admin/bookings";
import { getPaymentTotals, listPayments } from "@/lib/admin/payments";
import {
  buildPaymentsHref,
  hasActivePaymentFilters,
  NO_PAYMENT_FILTERS,
  parsePaymentFilters,
  PAYMENTS_PATH,
  type PaymentSearchParams,
} from "@/lib/admin/payments-params";
import { getOwnerName } from "@/lib/admin/users";
import { formatNumber, formatPrice } from "@/lib/format";
import { PaymentFilters } from "@/components/admin/PaymentFilters";
import { PaymentsTable } from "@/components/admin/PaymentsTable";
import { StatTiles } from "@/components/admin/StatTiles";
import { Card, CardContent } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";

// Route /admin/paiements — suivi des espèces, protégée (ADMIN).
export const metadata: Metadata = { title: "Paiements" };

interface PageProps {
  searchParams: PaymentSearchParams;
}

export default async function Page({ searchParams }: PageProps) {
  const session = await requireAdminPage(PAYMENTS_PATH);

  const requested = parsePaymentFilters(searchParams);

  // Un propriétaire inconnu retombe sur la liste complète plutôt que sur une
  // page vide sous un filtre fantôme.
  const ownerName = requested.ownerId
    ? await getOwnerName(requested.ownerId)
    : null;
  const filters = ownerName ? requested : { ...requested, ownerId: null };

  const [rows, totals, admins] = await Promise.all([
    listPayments(filters),
    getPaymentTotals(),
    listAdminOptions(),
  ]);

  const filtered = hasActivePaymentFilters(filters);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Suivi des paiements"
        description="Tout se règle en espèces : le client remet la somme à LIUDOR, qui la reverse ensuite au propriétaire. Cette page suit les deux mouvements, réservation par réservation."
      />

      {filters.ownerId && ownerName && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-accent/40 bg-accent/5 px-4 py-3">
          <p className="text-sm text-gray-700">
            Suivi filtré sur les salles de{" "}
            <span className="font-semibold text-gray-900">{ownerName}</span>.
          </p>
          <Link
            href={PAYMENTS_PATH}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-secondary transition-colors hover:text-primary-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
          >
            <RotateCcw aria-hidden className="h-4 w-4" />
            Voir tous les paiements
          </Link>
        </div>
      )}

      <StatTiles
        tiles={[
          {
            icon: Coins,
            label: `À encaisser (${formatNumber(totals.toCollectCount)})`,
            value: formatPrice(totals.toCollectAmount),
            tone: totals.toCollectCount > 0 ? "warning" : "neutral",
          },
          {
            icon: Banknote,
            label: "Encaissé auprès des clients",
            value: formatPrice(totals.collectedAmount),
            tone: "primary",
          },
          {
            icon: Wallet,
            label: `En caisse, à reverser (${formatNumber(totals.inHandCount)})`,
            value: formatPrice(totals.inHandAmount),
            tone: totals.inHandCount > 0 ? "error" : "neutral",
          },
          {
            icon: HandCoins,
            label: `Reversé aux propriétaires (${formatNumber(totals.paidOutCount)})`,
            value: formatPrice(totals.paidOutAmount),
            tone: "secondary",
          },
        ]}
      />

      <PaymentFilters filters={filters} />

      <p className="text-sm text-gray-500" aria-live="polite">
        {rows.length === 0
          ? "Aucune réservation à suivre."
          : `${rows.length} réservation${rows.length > 1 ? "s" : ""} affichée${
              rows.length > 1 ? "s" : ""
            }${filtered ? " pour ces critères" : ""}.`}
      </p>

      {rows.length === 0 ? (
        <EmptyState
          icon={Banknote}
          title={
            filtered
              ? "Aucune réservation pour ces critères"
              : "Aucun paiement à suivre"
          }
          description={
            filtered
              ? "Aucune réservation ne correspond à la recherche ou à l'étape sélectionnée."
              : "Les réservations déposées apparaîtront ici dès qu'il y aura des espèces à encaisser puis à reverser."
          }
          action={
            filtered
              ? {
                  href: buildPaymentsHref(NO_PAYMENT_FILTERS),
                  label: "Voir tous les paiements",
                }
              : { href: "/admin/reservations", label: "Voir les réservations" }
          }
        />
      ) : (
        <Card>
          <CardContent className="p-6">
            <PaymentsTable
              rows={rows}
              admins={admins}
              currentAdminId={session.adminId}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
