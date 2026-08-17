import nodemailer from "nodemailer";

/**
 * Envois d'emails de la plateforme (contact, demandes et décisions de
 * réservation).
 *
 * Deux transports possibles, dans cet ordre :
 * - **Gmail** (`GMAIL_USER` + `GMAIL_APP_PASSWORD`) : le plus simple à mettre
 *   en place, c'est la configuration de production actuelle. Le mot de passe
 *   attendu est un *mot de passe d'application* Google, pas le mot de passe du
 *   compte — Gmail refuse ce dernier depuis la fin de l'accès « applications
 *   moins sécurisées ».
 * - **SMTP générique** (`SMTP_HOST` et compagnie), pour un autre fournisseur.
 *
 * Sans l'un ni l'autre (environnement local), l'envoi est neutralisé : le
 * contenu reste persisté en base et consulté depuis l'administration. Tous les
 * envois sont *best-effort* — un échec est loggé mais ne fait jamais échouer
 * l'action appelante, car la copie en base est la source de vérité.
 */

interface MailerConfig {
  transporter: nodemailer.Transporter;
  /** Expéditeur des messages sortants. */
  from: string;
  /** Boîte de l'équipe LIUDOR. */
  team: string;
}

/** Transport configuré, ou `null` si aucun fournisseur n'est déclaré. */
function mailer(context: string): MailerConfig | null {
  const gmailUser = process.env.GMAIL_USER;
  const gmailPassword = process.env.GMAIL_APP_PASSWORD;

  if (gmailUser && gmailPassword) {
    // Gmail réécrit l'entête `From` avec l'adresse authentifiée : la forcer
    // ailleurs ne ferait qu'ajouter un « envoyé par » dans les clients mail.
    const from = process.env.SMTP_FROM ?? gmailUser;

    return {
      transporter: nodemailer.createTransport({
        service: "gmail",
        auth: { user: gmailUser, pass: gmailPassword },
      }),
      from,
      team: process.env.SMTP_TO ?? gmailUser,
    };
  }

  const host = process.env.SMTP_HOST;
  if (!host) {
    console.warn(
      `[${context}] Aucun transport email configuré (ni GMAIL_USER/GMAIL_APP_PASSWORD, ni SMTP_HOST) : aucun email envoyé.`
    );
    return null;
  }

  const user = process.env.SMTP_USER ?? "";
  const pass = process.env.SMTP_PASSWORD ?? "";
  const from = process.env.SMTP_FROM ?? "contact@liudor.dz";

  return {
    transporter: nodemailer.createTransport({
      host,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_SECURE === "true",
      ...(user && pass ? { auth: { user, pass } } : {}),
    }),
    from,
    team: process.env.SMTP_TO ?? from,
  };
}

export async function sendContactEmail({
  fullName,
  email,
  subject,
  message,
}: {
  fullName: string;
  email: string;
  subject: string;
  message: string;
}): Promise<boolean> {
  const config = mailer("contact");
  if (!config) return false;

  try {
    await config.transporter.sendMail({
      from: config.from,
      to: config.team,
      replyTo: email,
      subject: `[Contact LIUDOR] ${subject}`,
      text: [
        `Nom : ${fullName}`,
        `Email : ${email}`,
        `Sujet : ${subject}`,
        "",
        message,
      ].join("\n"),
    });
    return true;
  } catch (error) {
    console.error("[contact] envoi email échoué", error);
    return false;
  }
}

export interface BookingRequestMail {
  clientName: string;
  clientEmail: string;
  contactPhone: string;
  roomName: string;
  roomCity: string;
  eventType: string;
  /** Date de l'événement, déjà formatée pour lecture humaine. */
  eventDate: string;
  guestsCount: number;
}

/**
 * Demande de réservation : alerte l'équipe et accuse réception au client.
 *
 * Deux envois distincts plutôt qu'une copie cachée : l'équipe doit pouvoir
 * répondre directement au client (`replyTo`), et le client reçoit un texte
 * écrit pour lui, qui rappelle que rien n'est confirmé tant que l'équipe ne
 * l'a pas rappelé. L'un peut échouer sans empêcher l'autre.
 */
export async function sendBookingRequestEmails(
  request: BookingRequestMail
): Promise<void> {
  const config = mailer("réservation");
  if (!config) return;

  const details = [
    `Client : ${request.clientName}`,
    `Email : ${request.clientEmail}`,
    `Téléphone : ${request.contactPhone}`,
    `Salle : ${request.roomName} (${request.roomCity})`,
    `Type d'événement : ${request.eventType}`,
    `Date : ${request.eventDate}`,
    `Invités : ${request.guestsCount}`,
  ];

  const results = await Promise.allSettled([
    config.transporter.sendMail({
      from: config.from,
      to: config.team,
      replyTo: request.clientEmail,
      subject: `[Réservation LIUDOR] ${request.roomName} — ${request.eventDate}`,
      text: [
        "Nouvelle demande de réservation à traiter.",
        "",
        ...details,
        "",
        "À reprendre depuis /admin/reservations pour confirmer avec le client.",
      ].join("\n"),
    }),
    config.transporter.sendMail({
      from: config.from,
      to: request.clientEmail,
      replyTo: config.team,
      subject: `Votre demande de réservation — ${request.roomName}`,
      text: [
        `Bonjour ${request.clientName},`,
        "",
        "Nous avons bien reçu votre demande de réservation. Elle n'est pas",
        "encore confirmée : l'équipe LIUDOR vous contacte sous 24 h ouvrées",
        "pour valider la date, le montant et les modalités de règlement.",
        "",
        "Récapitulatif de votre demande :",
        ...details.slice(3),
        "",
        "À très vite,",
        "L'équipe LIUDOR",
      ].join("\n"),
    }),
  ]);

  for (const result of results) {
    if (result.status === "rejected") {
      console.error("[réservation] envoi email échoué", result.reason);
    }
  }
}

export interface BookingDecisionMail {
  decision: "CONFIRMEE" | "ANNULEE";
  clientName: string;
  clientEmail: string;
  roomName: string;
  roomCity: string;
  eventType: string;
  /** Date de l'événement, déjà formatée pour lecture humaine. */
  eventDate: string;
  guestsCount: number;
  /** Propriétaire de la salle : prévenu que sa date est fermée. */
  ownerName: string;
  ownerEmail: string;
}

/**
 * Décision de l'administration sur une réservation.
 *
 * Le client reçoit le verdict, le propriétaire reçoit l'information que sa date
 * vient d'être fermée (ou libérée) dans son calendrier — c'est la contrepartie
 * de la fermeture automatique décidée dans `setBookingDecision` : sans cet
 * email, il découvrirait la date bloquée sans savoir pourquoi.
 *
 * Les deux envois sont indépendants : l'un peut échouer sans empêcher l'autre.
 */
export async function sendBookingDecisionEmails(
  decision: BookingDecisionMail
): Promise<void> {
  const config = mailer("décision réservation");
  if (!config) return;

  const confirmed = decision.decision === "CONFIRMEE";

  const details = [
    `Salle : ${decision.roomName} (${decision.roomCity})`,
    `Type d'événement : ${decision.eventType}`,
    `Date : ${decision.eventDate}`,
    `Invités : ${decision.guestsCount}`,
  ];

  const clientBody = confirmed
    ? [
        `Bonjour ${decision.clientName},`,
        "",
        "Votre réservation est confirmée. La date est désormais bloquée pour",
        "vous : plus personne ne peut la réserver.",
        "",
        ...details,
        "",
        "Le règlement se fait en espèces auprès de l'équipe LIUDOR. Pour toute",
        "modification, répondez simplement à cet email.",
        "",
        "À très vite,",
        "L'équipe LIUDOR",
      ]
    : [
        `Bonjour ${decision.clientName},`,
        "",
        "Votre demande de réservation n'a pas pu être retenue et vient d'être",
        "annulée.",
        "",
        ...details,
        "",
        "D'autres salles restent disponibles à cette date sur liudor.dz, et",
        "l'équipe peut vous aider à en trouver une : répondez à cet email.",
        "",
        "L'équipe LIUDOR",
      ];

  const ownerBody = confirmed
    ? [
        `Bonjour ${decision.ownerName},`,
        "",
        "Une réservation vient d'être confirmée sur votre salle. La date a été",
        "fermée automatiquement dans votre calendrier de disponibilités : elle",
        "n'est plus réservable et ne peut plus être rouverte depuis votre",
        "espace.",
        "",
        ...details,
        `Client : ${decision.clientName}`,
        "",
        "L'équipe LIUDOR",
      ]
    : [
        `Bonjour ${decision.ownerName},`,
        "",
        "Une demande de réservation sur votre salle a été annulée. La date",
        "reste fermée dans votre calendrier : rouvrez-la depuis votre espace",
        "propriétaire si vous souhaitez la remettre à la location.",
        "",
        ...details,
        "",
        "L'équipe LIUDOR",
      ];

  const results = await Promise.allSettled([
    config.transporter.sendMail({
      from: config.from,
      to: decision.clientEmail,
      replyTo: config.team,
      subject: confirmed
        ? `Réservation confirmée — ${decision.roomName}, ${decision.eventDate}`
        : `Réservation annulée — ${decision.roomName}, ${decision.eventDate}`,
      text: clientBody.join("\n"),
    }),
    config.transporter.sendMail({
      from: config.from,
      to: decision.ownerEmail,
      replyTo: config.team,
      subject: confirmed
        ? `[LIUDOR] Date confirmée — ${decision.roomName}, ${decision.eventDate}`
        : `[LIUDOR] Demande annulée — ${decision.roomName}, ${decision.eventDate}`,
      text: ownerBody.join("\n"),
    }),
  ]);

  for (const result of results) {
    if (result.status === "rejected") {
      console.error("[décision réservation] envoi email échoué", result.reason);
    }
  }
}
