"use client";

import { Alert, Card } from "@heroui/react";
import Link from "next/link";

export function AuthCard({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-6">
      <Card className="gap-6 p-6 sm:p-8">
        <Card.Header className="gap-1">
          <h1 className="text-xl font-bold tracking-tight">{title}</h1>
          {description && <Card.Description>{description}</Card.Description>}
        </Card.Header>
        {children}
      </Card>
      {footer && <p className="text-muted text-center text-sm">{footer}</p>}
    </div>
  );
}

export function FormAlert({
  status = "danger",
  children,
}: {
  status?: "danger" | "success" | "warning" | "default";
  children: React.ReactNode;
}) {
  return (
    <Alert status={status} role={status === "danger" ? "alert" : "status"}>
      <Alert.Indicator />
      <Alert.Content>
        <Alert.Description>{children}</Alert.Description>
      </Alert.Content>
    </Alert>
  );
}

export function TextLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="text-link rounded-sm font-medium underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
    >
      {children}
    </Link>
  );
}

type AuthError = { status?: number; code?: string; message?: string } | null | undefined;

/** Maps Better Auth errors to short, non-revealing messages. */
export function authErrorMessage(error: AuthError, fallback = "Something went wrong. Please try again.") {
  if (!error) return fallback;
  if (error.status === 429) return "Too many attempts. Please wait a minute and try again.";
  switch (error.code) {
    case "INVALID_EMAIL_OR_PASSWORD":
      return "Incorrect email or password.";
    case "EMAIL_NOT_VERIFIED":
      return "Please confirm your email first. We've sent you a new link.";
    case "USER_ALREADY_EXISTS":
    case "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL":
      return "An account with this email already exists. Sign in instead.";
    case "PASSWORD_TOO_SHORT":
      return "Password must be at least 10 characters.";
    case "PASSWORD_TOO_LONG":
      return "Password is too long.";
    case "INVALID_TOKEN":
      return "This link is invalid or has expired.";
  }
  if (error.status === 403 && error.message) return error.message;
  return fallback;
}
