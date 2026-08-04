import type { Metadata } from "next";
import { MailQuestion } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { MarkMessageReadButton } from "@/components/admin/MarkMessageReadButton";
import { cn } from "@/lib/utils";

// Route /admin/messages — messages du formulaire /contact, protégée (ADMIN).
export const metadata: Metadata = { title: "Messages" };

const dateTimeFormatter = new Intl.DateTimeFormat("fr-DZ", {
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export default async function Page() {
  const [messages, unreadCount] = await Promise.all([
    prisma.contactMessage.findMany({
      orderBy: { createdAt: "desc" },
    }),
    prisma.contactMessage.count({ where: { readAt: null } }),
  ]);

  return (
    <div className="mx-auto max-w-5xl">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Messages de contact
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Demandes reçues via le formulaire /contact. Marquez-les comme lues
            une fois traitées.
          </p>
        </div>
        <span
          className={cn(
            "rounded-full px-3 py-1 text-sm font-semibold",
            unreadCount > 0
              ? "bg-warning/15 text-warning"
              : "bg-gray-100 text-gray-500"
          )}
        >
          {unreadCount} non lu{unreadCount > 1 ? "s" : ""}
        </span>
      </header>

      {messages.length === 0 ? (
        <div className="mt-8 flex flex-col items-center gap-3 rounded-lg border border-dashed border-gray-300 bg-white p-12 text-center">
          <MailQuestion aria-hidden className="h-10 w-10 text-gray-300" />
          <p className="text-sm text-gray-500">
            Aucun message pour le moment. Les envois du formulaire de contact
            s&apos;afficheront ici.
          </p>
        </div>
      ) : (
        <div className="mt-8 flex flex-col gap-4">
          {messages.map((message) => {
            const isRead = Boolean(message.readAt);
            return (
              <article
                key={message.id}
                className={cn(
                  "rounded-lg border bg-white p-6 shadow-sm",
                  isRead
                    ? "border-gray-200"
                    : "border-accent/50 ring-1 ring-accent/30"
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-base font-semibold text-gray-900">
                      {message.subject}
                    </h2>
                    <p className="mt-0.5 text-sm text-gray-500">
                      {message.fullName} ·{" "}
                      <a
                        href={`mailto:${message.email}`}
                        className="text-secondary hover:text-primary-900"
                      >
                        {message.email}
                      </a>
                    </p>
                    <p className="mt-0.5 text-xs text-gray-400">
                      {dateTimeFormatter.format(message.createdAt)}
                    </p>
                  </div>
                  <MarkMessageReadButton
                    messageId={message.id}
                    read={isRead}
                  />
                </div>
                <p className="mt-4 whitespace-pre-line text-sm text-gray-700">
                  {message.message}
                </p>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
