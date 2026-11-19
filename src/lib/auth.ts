import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { isRegisteredAttendee } from "./attendees";
import { EVENT } from "./event";
import { env } from "./env";
import { sendInBackground } from "./mail";

export const auth = betterAuth({
  appName: EVENT.name,
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  trustedOrigins: [env.BETTER_AUTH_URL],
  database: drizzleAdapter(db, {
    provider: "sqlite",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
      rateLimit: schema.rateLimit,
    },
  }),

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    autoSignIn: false,
    minPasswordLength: 10,
    maxPasswordLength: 128,
    resetPasswordTokenExpiresIn: 60 * 60,
    revokeSessionsOnPasswordReset: true,
    onExistingUserSignUp: async ({ user }) => {
      sendInBackground({
        to: user.email,
        subject: `Your ${EVENT.name} account`,
        text: `Hi ${user.name},\n\nSomeone tried to create a new account with this email address, but you already have one. Sign in at ${env.BETTER_AUTH_URL}/login, or reset your password at ${env.BETTER_AUTH_URL}/forgot-password.\n\nIf this wasn't you, you can ignore this email.`,
      });
    },
    sendResetPassword: async ({ user, url }) => {
      sendInBackground({
        to: user.email,
        subject: `Reset your password – ${EVENT.name}`,
        text: `Hi ${user.name},\n\nUse the link below to choose a new password. It expires in one hour.\n\n${url}\n\nIf you did not request this, you can ignore this email.`,
      });
    },
  },

  emailVerification: {
    sendOnSignUp: true,
    sendOnSignIn: true,
    autoSignInAfterVerification: true,
    expiresIn: 60 * 60 * 24,
    sendVerificationEmail: async ({ user, url }) => {
      sendInBackground({
        to: user.email,
        subject: `Confirm your email – ${EVENT.name}`,
        text: `Hi ${user.name},\n\nConfirm your email address to activate your account:\n\n${url}\n\nIf you did not create an account, you can ignore this email.`,
      });
    },
  },

  user: {
    changeEmail: { enabled: false },
    deleteUser: { enabled: false },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 14,
    updateAge: 60 * 60 * 24,
  },

  rateLimit: {
    enabled: true,
    storage: "database",
    window: 60,
    max: 60,
    customRules: {
      "/sign-in/email": { window: 60, max: 5 },
      "/sign-up/email": { window: 60 * 10, max: 5 },
      "/request-password-reset": { window: 60 * 10, max: 3 },
      "/forget-password": { window: 60 * 10, max: 3 },
      "/reset-password": { window: 60 * 10, max: 5 },
      "/send-verification-email": { window: 60 * 10, max: 3 },
    },
  },

  advanced: {
    useSecureCookies: env.NODE_ENV === "production",
    cookiePrefix: "symposium",
  },

  databaseHooks: {
    user: {
      create: {
        // Only people registered for the symposium on gewis.nl may create an account.
        before: async (user) => {
          const email = user.email.trim().toLowerCase();
          if (!isRegisteredAttendee(email)) {
            // Better Auth answers this sign-up with a generic success so the form
            // never reveals who is registered. The explanation goes by email.
            sendInBackground({
              to: email,
              subject: `Your ${EVENT.name} account`,
              text: `Hi,\n\nSomeone tried to create an account for ${EVENT.name} with this email address, but it is not registered for the symposium.\n\nSign up for the symposium on ${EVENT.gewisUrl} first, then create your account with the same email address. Registrations are synchronised periodically, so it may take a while before you can create your account.\n\nIf this wasn't you, you can ignore this email.`,
            });
            throw new APIError("FORBIDDEN", {
              message: "This email address is not registered for the symposium.",
            });
          }
          return { data: { ...user, email, name: user.name.trim().slice(0, 100) } };
        },
      },
    },
  },

  plugins: [nextCookies()],
});
