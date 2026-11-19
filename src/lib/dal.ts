import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { isRegisteredAttendee } from "./attendees";
import { auth } from "./auth";

export type CurrentUser = { id: string; name: string; email: string };

type Access =
  | { status: "anonymous" }
  | { status: "unregistered" }
  | { status: "ok"; user: CurrentUser };

/**
 * Data Access Layer: the single place that decides who is signed in.
 * Access requires a valid session, a verified email address, and an email
 * that is still on the attendee list.
 */
export const getAccess = cache(async (): Promise<Access> => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || !session.user.emailVerified) return { status: "anonymous" };
  const { id, name, email } = session.user;
  if (!isRegisteredAttendee(email)) return { status: "unregistered" };
  return { status: "ok", user: { id, name, email } };
});

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const access = await getAccess();
  return access.status === "ok" ? access.user : null;
}

/** For pages: redirects to the login page when nobody valid is signed in. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
