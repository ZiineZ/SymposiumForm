import "server-only";
import type { RegistrationWindow } from "./enrollment";
import { env } from "./env";

export const registrationWindow: RegistrationWindow = {
  opensAt: new Date(env.REGISTRATION_OPENS_AT),
  closesAt: env.REGISTRATION_CLOSES_AT ? new Date(env.REGISTRATION_CLOSES_AT) : undefined,
};
