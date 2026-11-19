import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { setting } from "@/db/schema";
import type { RegistrationWindow } from "./enrollment";

export type Settings = { registrationOpensAt: Date | null; registrationClosesAt: Date | null };

export function getSettings(): Settings {
  const row = db.select().from(setting).where(eq(setting.id, 1)).get();
  return {
    registrationOpensAt: row?.registrationOpensAt ?? null,
    registrationClosesAt: row?.registrationClosesAt ?? null,
  };
}

export function saveSettings(values: Settings) {
  db.insert(setting)
    .values({ id: 1, ...values })
    .onConflictDoUpdate({ target: setting.id, set: values })
    .run();
}

export function getRegistrationWindow(): RegistrationWindow {
  const s = getSettings();
  return { opensAt: s.registrationOpensAt, closesAt: s.registrationClosesAt ?? undefined };
}
