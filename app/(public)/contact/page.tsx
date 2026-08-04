import type { Metadata } from "next";
import { Mail, Phone, MapPin, Clock } from "lucide-react";
import { ContactForm } from "@/components/contact/ContactForm";

// Route /contact — formulaire de contact, coordonnées et FAQ courte.
export const metadata: Metadata = { title: "Contact" };

const COORDINATES = [
  { icon: Mail, title: "Email", lines: ["contact@liudor.dz"] },
  { icon: Phone, title: "Téléphone", lines: ["+213 (0) 21 00 00 00", "Samedi – jeudi, 9h à 18h"] },
  { icon: MapPin, title: "Adresse", lines: ["Cité des Annassers,", "Alger, Algérie"] },
  { icon: Clock, title: "Réponse", lines: ["Sous 24 h ouvrées", "en semaine"] },
];

const FAQ = [
  {
    question: "Comment réserver une salle ?",
    answer:
      "Parcourez le catalogue, ouvrez la fiche d'une salle et utilisez le calendrier pour vérifier la disponibilité sur vos dates. La demande part ensuite au propriétaire, qui vous recontacte pour finaliser.",
  },
  {
    question: "Je suis propriétaire, comment publier ma salle ?",
    answer:
      "Créez un compte Propriétaire puis accédez à votre espace pour soumettre votre salle. L'équipe LIUDOR la vérifie avant de la publier, d'habitude sous 48 h.",
  },
  {
    question: "Une annulation est-elle remboursée ?",
    answer:
      "Les conditions figurent sur chaque fiche salle. En cas de question sur un remboursement précis, écrivez-nous depuis ce formulaire en précisant la référence de votre réservation.",
  },
];

export default function Page() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:py-14">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
          Contact
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-gray-500">
          Une question sur une salle, un événement ou votre compte ? Écrivez à
          l&apos;équipe LIUDOR, nous vous répondons sous 24 h ouvrées.
        </p>
      </header>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_2fr] lg:gap-14">
        <div className="flex flex-col gap-6">
          {COORDINATES.map(({ icon: Icon, title, lines }) => (
            <div key={title} className="flex gap-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary-900 text-white">
                <Icon aria-hidden className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
                {lines.map((line) => (
                  <p key={line} className="mt-0.5 text-sm text-gray-500">
                    {line}
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div>
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-lg font-semibold text-gray-900">
              Envoyez-nous un message
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Les champs sont obligatoires, le message doit compter au moins
              10 caractères.
            </p>
            <div className="mt-6">
              <ContactForm />
            </div>
          </div>
        </div>
      </div>

      <section className="mt-16">
        <h2 className="text-2xl font-bold tracking-tight text-gray-900">
          Questions fréquentes
        </h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {FAQ.map(({ question, answer }) => (
            <details
              key={question}
              className="group rounded-lg border border-gray-200 bg-white p-5 shadow-sm open:pb-6"
            >
              <summary className="cursor-pointer list-none text-sm font-semibold text-gray-900 marker:hidden">
                {question}
              </summary>
              <p className="mt-3 text-sm text-gray-500">{answer}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
