import "server-only";
import nodemailer from "nodemailer";
import { env } from "./env";

const transport = env.SMTP_HOST
  ? nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      requireTLS: env.SMTP_PORT !== 465,
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
    })
  : null;

type Mail = { to: string; subject: string; text: string };

/**
 * Plain-text mail only: nothing user-controlled is ever rendered as HTML.
 * Without SMTP configured (development only, enforced in env.ts) the mail is
 * printed to the server console instead.
 */
async function send(mail: Mail) {
  if (!transport) {
    console.info(`\n[mail] to=${mail.to}\n[mail] subject=${mail.subject}\n${mail.text}\n`);
    return;
  }
  await transport.sendMail({ from: env.MAIL_FROM, ...mail });
}

/** Fire-and-forget so response timing does not reveal whether an account exists. */
export function sendInBackground(mail: Mail) {
  send(mail).catch((err) => console.error("[mail] delivery failed", err));
}
