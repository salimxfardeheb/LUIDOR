import nodemailer from "nodemailer";

/**
 * Envoi d'email du formulaire de contact vers l'équipe LIUDOR via SMTP.
 *
 * Tant que `SMTP_HOST` est vide (environnement local), l'envoi est neutralisé :
 * le message reste persisté en base et consulté depuis /admin/messages. L'envoi
 * est *best-effort* — un échec SMTP est loggé mais ne fait pas échouer le
 * formulaire, car la copie en base sert de source de vérité pour l'équipe.
 */
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
  const host = process.env.SMTP_HOST;
  if (!host) {
    console.warn(
      "[contact] SMTP non configuré : message persisté en base uniquement."
    );
    return false;
  }

  const port = Number(process.env.SMTP_PORT ?? 587);
  const secure = process.env.SMTP_SECURE === "true";
  const user = process.env.SMTP_USER ?? "";
  const pass = process.env.SMTP_PASSWORD ?? "";
  const from = process.env.SMTP_FROM ?? "contact@liudor.dz";
  const to = process.env.SMTP_TO ?? from;

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    ...(user && pass ? { auth: { user, pass } } : {}),
  });

  try {
    await transporter.sendMail({
      from,
      to,
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
