/** Liveness: the server process answers. Deliberately does not touch the database. */
export function GET() {
  return Response.json({ status: "ok" }, { headers: { "Cache-Control": "no-store" } });
}
