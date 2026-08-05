import { History, LogIn } from "lucide-react";
import type { AuditEntry } from "@/lib/admin/audit";
import { AUDIT_ACTIONS } from "@/lib/admin/audit";
import { ADMIN_TH } from "@/components/admin/table";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { formatDateTime, formatRelativeTime } from "@/lib/format";

/**
 * Sécurité & journaux.
 *
 * Deux lectures distinctes : qui s'est connecté, et ce qui a été fait. Les
 * séparer évite qu'une rafale de connexions noie les décisions prises sur la
 * plateforme, et inversement.
 */
export function SecurityLogs({
  signIns,
  actions,
}: {
  signIns: AuditEntry[];
  actions: AuditEntry[];
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Card className="flex flex-col gap-4 p-6">
        <div>
          <h3 className="flex items-center gap-2 text-base font-semibold text-gray-900">
            <LogIn aria-hidden className="h-4 w-4 text-secondary" />
            Dernières connexions administrateur
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Une connexion inattendue — compte inconnu, horaire inhabituel — doit
            être signalée sans attendre.
          </p>
        </div>

        {signIns.length === 0 ? (
          <EmptyLog message="Aucune connexion enregistrée pour le moment." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] text-sm">
              <caption className="sr-only">
                Dernières connexions des comptes administrateur.
              </caption>
              <thead>
                <tr className="border-b border-gray-200">
                  <th scope="col" className={ADMIN_TH}>
                    Compte
                  </th>
                  <th scope="col" className={ADMIN_TH}>
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {signIns.map((entry) => (
                  <tr key={entry.id}>
                    <th scope="row" className="py-3 pr-4 text-left font-medium">
                      <span className="block truncate text-gray-900">
                        {entry.authorName ?? "Compte supprimé"}
                      </span>
                      {entry.authorEmail && (
                        <span className="block truncate text-xs font-normal text-gray-400">
                          {entry.authorEmail}
                        </span>
                      )}
                    </th>
                    <td className="whitespace-nowrap py-3 text-gray-600">
                      <time
                        dateTime={entry.at}
                        title={formatDateTime(entry.at)}
                      >
                        {formatRelativeTime(entry.at)}
                      </time>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card className="flex flex-col gap-4 p-6">
        <div>
          <h3 className="flex items-center gap-2 text-base font-semibold text-gray-900">
            <History aria-hidden className="h-4 w-4 text-secondary" />
            Historique des actions importantes
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Validations, encaissements, suspensions et modifications de
            configuration, avec leur auteur.
          </p>
        </div>

        {actions.length === 0 ? (
          <EmptyLog message="Aucune action enregistrée pour le moment." />
        ) : (
          <ul className="divide-y divide-gray-100">
            {actions.map((entry) => {
              const config = AUDIT_ACTIONS[entry.action];

              return (
                <li key={entry.id} className="flex flex-col gap-1 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={config.variant}>{config.label}</Badge>
                    {entry.target && (
                      <span className="min-w-0 truncate text-sm text-gray-900">
                        {entry.target}
                      </span>
                    )}
                  </div>
                  {entry.detail && (
                    <p className="text-xs text-gray-500">{entry.detail}</p>
                  )}
                  <p className="text-xs text-gray-400">
                    {entry.authorName ?? "Compte supprimé"} ·{" "}
                    <time dateTime={entry.at} title={formatDateTime(entry.at)}>
                      {formatRelativeTime(entry.at)}
                    </time>
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}

function EmptyLog({ message }: { message: string }) {
  return (
    <p className="rounded-md border border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">
      {message}
    </p>
  );
}
