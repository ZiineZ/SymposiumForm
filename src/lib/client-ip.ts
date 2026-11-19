/**
 * The client address as seen by the reverse proxy. On the GEWIS cluster Traefik's
 * real-ip plugin always sets a trustworthy X-Real-Ip; the right-most
 * X-Forwarded-For entry is the fallback (added by the last proxy, not the client).
 */
export function clientIp(headers: Headers): string {
  const real = headers.get("x-real-ip")?.trim();
  if (real) return real.slice(0, 64);
  const forwarded = headers.get("x-forwarded-for")?.split(",").at(-1)?.trim();
  return forwarded ? forwarded.slice(0, 64) : "unknown";
}
