import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { EVENT } from "./event";
import { env } from "./env";
import { consumeInvite } from "./invites";
import { sendInBackground } from "./mail";

export const auth = betterAuth({
  appName: EVENT.name,
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  trustedOrigins: [env.BETTER_AUTH_URL],
  database: drizzleAdapter(db, {
    provider: "pg",
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
    // Traefik on the GEWIS cluster sets a trustworthy X-Real-Ip (see src/lib/client-ip.ts).
    ipAddress: { ipAddressHeaders: ["x-real-ip", "x-forwarded-for"] },
  },

  databaseHooks: {
    user: {
      create: {
        // Accounts can only be created through sign-up with a valid invite link.
        // The token travels in a header; using it up is one atomic UPDATE.
        before: async (user, ctx) => {
          const token = ctx?.headers?.get("x-invite-token") ?? "";
          if (ctx?.path !== "/sign-up/email" || !(await consumeInvite(db, token))) {
            throw new APIError("BAD_REQUEST", {
              code: "INVALID_INVITE",
              message: "This invite link is invalid or has expired.",
            });
          }
          return {
            data: { ...user, email: user.email.trim().toLowerCase(), name: user.name.trim().slice(0, 100) },
          };
        },
      },
    },
  },

  plugins: [nextCookies()],
});
