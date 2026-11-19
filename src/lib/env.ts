import "server-only";
import { z } from "zod";

const isoDate = z
  .string()
  .refine((v) => !Number.isNaN(Date.parse(v)), "must be an ISO 8601 date-time");

const schema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    DATABASE_PATH: z.string().min(1).default("./data/symposium.db"),
    BETTER_AUTH_SECRET: z.string().min(32, "must be at least 32 characters"),
    BETTER_AUTH_URL: z.url(),
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.coerce.number().int().positive().default(587),
    SMTP_USER: z.string().optional(),
    SMTP_PASS: z.string().optional(),
    MAIL_FROM: z.string().default("GEWIS Lustrum Symposium <noreply@gewis.nl>"),
    REGISTRATION_OPENS_AT: isoDate,
    REGISTRATION_CLOSES_AT: isoDate.optional(),
  })
  .refine((e) => e.NODE_ENV !== "production" || Boolean(e.SMTP_HOST), {
    path: ["SMTP_HOST"],
    message: "is required in production (verification and reset emails)",
  })
  .refine((e) => e.NODE_ENV !== "production" || e.BETTER_AUTH_URL.startsWith("https://"), {
    path: ["BETTER_AUTH_URL"],
    message: "must use https in production",
  });

// `next build` imports server modules to collect route config. Secrets are not
// needed (or wanted) at build time, so validation runs when the server starts.
// Every page is dynamic, so nothing is prerendered with these placeholders.
const isBuild = process.env.NEXT_PHASE === "phase-production-build";

const parsed = isBuild
  ? schema.safeParse({
      NODE_ENV: "test",
      DATABASE_PATH: ":memory:",
      BETTER_AUTH_SECRET: "build-time-placeholder-not-used-at-runtime",
      BETTER_AUTH_URL: "http://localhost:3000",
      REGISTRATION_OPENS_AT: new Date(0).toISOString(),
    })
  : schema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `  ${i.path.join(".")}: ${i.message}`).join("\n");
  throw new Error(`Invalid environment configuration:\n${issues}`);
}

export const env = parsed.data;
