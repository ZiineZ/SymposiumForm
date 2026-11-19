import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/join", "/forgot-password", "/reset-password", "/admin/login"];
const ADMIN_COOKIES = ["__Host-symposium-admin", "symposium-admin"];

const matches = (pathname: string, prefix: string) => pathname === prefix || pathname.startsWith(`${prefix}/`);

function contentSecurityPolicy(nonce: string) {
  const isDev = process.env.NODE_ENV === "development";
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    // React Aria positions overlays with inline style attributes.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data:",
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Optimistic checks only (cookie presence). The real checks happen on every
  // page and action: src/lib/dal.ts for attendees, src/lib/admin-auth.ts for admins.
  if (!PUBLIC_PATHS.some((p) => matches(pathname, p))) {
    if (matches(pathname, "/admin")) {
      if (!ADMIN_COOKIES.some((name) => request.cookies.has(name))) {
        return NextResponse.redirect(new URL("/admin/login", request.url));
      }
    } else if (!getSessionCookie(request, { cookiePrefix: "symposium" })) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = contentSecurityPolicy(nonce);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: [
    {
      // Everything except API routes, Next internals and static files from public/.
      source: "/((?!api|_next/static|_next/image|.*\\.(?:svg|png|ico|txt)$).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
