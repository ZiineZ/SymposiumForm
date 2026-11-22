import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { setting } from "@/db/schema";
import type { RegistrationWindow } from "./enrollment";

export type Settings = { registrationOpensAt: Date | null; registrationClosesAt: Date | null };

export async function getSettings(): Promise<Settings> {
  const [row] = await db.select().from(setting).where(eq(setting.id, 1));
  return {
    registrationOpensAt: row?.registrationOpensAt ?? null,
    registrationClosesAt: row?.registrationClosesAt ?? null,
  };
}

export async function saveSettings(values: Settings) {
  await db
    .insert(setting)
    .values({ id: 1, ...values })
    .onConflictDoUpdate({ target: setting.id, set: values });
}

export async function getRegistrationWindow(): Promise<RegistrationWindow> {
  const s = await getSettings();
  return { opensAt: s.registrationOpensAt, closesAt: s.registrationClosesAt ?? undefined };
}
