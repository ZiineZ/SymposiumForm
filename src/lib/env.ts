import "server-only";
import { z } from "zod";

/** Treats `KEY=` (empty) the same as an unset variable. */
const optional = <T extends z.ZodType>(inner: T) =>
  z.preprocess((v) => (v === "" ? undefined : v), inner.optional());

const schema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    DATABASE_PATH: z.string().min(1).default("./data/symposium.db"),
    BETTER_AUTH_SECRET: z.string().min(32, "must be at least 32 characters"),
    BETTER_AUTH_URL: z.url(),
    SMTP_HOST: optional(z.string()),
    SMTP_PORT: z.coerce.number().int().positive().default(587),
    SMTP_USER: optional(z.string()),
    SMTP_PASS: optional(z.string()),
    MAIL_FROM: z.string().default("GEWIS Lustrum Symposium <noreply@gewis.nl>"),
    // Admin sign-in. Generate with `npm run admin:credentials`; without them the admin login is disabled.
    ADMIN_USERNAME_SHA256: optional(z.string().regex(/^[0-9a-f]{64}$/, "must be a lower-case hex SHA-256")),
    ADMIN_PASSWORD_HASH: optional(
      z.string().regex(/^[0-9a-f]+:[0-9a-f]+$/, "must be a hash from `npm run admin:credentials`"),
    ),
  })
  .refine((e) => e.NODE_ENV !== "production" || Boolean(e.SMTP_HOST), {
    path: ["SMTP_HOST"],
    message: "is required in production (verification and reset emails)",
  })
  .refine((e) => Boolean(e.ADMIN_USERNAME_SHA256) === Boolean(e.ADMIN_PASSWORD_HASH), {
    path: ["ADMIN_PASSWORD_HASH"],
    message: "set both ADMIN_USERNAME_SHA256 and ADMIN_PASSWORD_HASH, or neither",
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
    })
  : schema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `  ${i.path.join(".")}: ${i.message}`).join("\n");
  throw new Error(`Invalid environment configuration:\n${issues}`);
}

export const env = parsed.data;
