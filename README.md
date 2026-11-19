# GEWIS Lustrum Symposium

Sign-up site for the GEWIS Lustrum Symposium (*Hidden Gems*, Evoluon). Attendees sign in with their own email and password, see their personal schedule, and subscribe to speaker sessions (first come, first served).

**Stack:** Next.js 16 (App Router) · HeroUI v3 · Tailwind CSS v4 · Better Auth · Drizzle ORM · SQLite

## How it works

- **Who can sign up:** only email addresses on the attendee list. You import that list from the gewis.nl activity registrations (see below). Accounts need a verified email address.
- **Schedule (`/`):** plenary items plus the sessions the attendee subscribed to. *Add to calendar* downloads an `.ics` file.
- **Speakers (`/speakers`):** each speaker has one or more sessions, each with a time, a room and a capacity. People can attend at most one session per speaker, and never two sessions that overlap.
- **Registration window:** subscribing and unsubscribing only work between `REGISTRATION_OPENS_AT` and `REGISTRATION_CLOSES_AT`.

## Local development

```bash
npm install
cp .env.example .env.local          # then fill in BETTER_AUTH_SECRET (openssl rand -base64 48)
npm run db:migrate
npm run program:seed
npm run attendees:import -- path/to/registrations.csv
npm run dev
```

Without `SMTP_HOST`, verification and reset emails are printed to the dev server console.

## Managing data

| Task | Command |
| --- | --- |
| Import/refresh attendee emails (any CSV/TSV/text export) | `npm run attendees:import -- file.csv` |
| Same, and remove people no longer in the export | `npm run attendees:import -- file.csv --replace` |
| Load speakers, sessions and plenary items | edit `content/program.json`, then `npm run program:seed` |
| Apply database migrations | `npm run db:migrate` |
| After changing `src/db/schema.ts` | `npm run db:generate` and commit `drizzle/` |

`program:seed` can be re-run any time: rows are matched on `slug` / `key`, so subscriptions are kept. It refuses to delete a session that people are subscribed to. Times in `program.json` need an explicit offset (`+01:00` in winter, `+02:00` in summer).

> `content/program.json` holds **placeholder** speakers and a placeholder date (17 March 2027). Replace them with the real programme.

Removing someone from the attendee list revokes their access on their next request.

## Checks

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## Deployment

Run it as a long-lived Node server (`npm run build && npm start`), for example on a VPS or in a container, **not** on serverless hosting: the SQLite database is a local file.

1. Set the environment variables from `.env.example` as real environment variables. In production the app refuses to start without `SMTP_HOST` and an `https://` `BETTER_AUTH_URL`.
2. Put `DATABASE_PATH` on persistent storage and back it up.
3. Run `npm run db:migrate` on every deploy, before starting the server.
4. Serve it behind a reverse proxy (nginx, Caddy, Traefik) that terminates TLS and sets `X-Forwarded-For`. The rate limiter uses that header to identify clients, so don't expose the Node port directly.

## Security

- **Authentication** with [Better Auth](https://better-auth.com): scrypt password hashing, required email verification, single-use expiring reset links, and all sessions revoked on a password reset. Origin checks block CSRF and open redirects.
- **Rate limiting** on all auth endpoints, stored in the database (sign-in: 5 per minute; sign-up, resets, verification mails: a few per 10 minutes).
- **No account enumeration:** sign-up and password reset respond the same whether or not an address is registered. The explanation goes to the inbox.
- **Authorization** in one Data Access Layer (`src/lib/dal.ts`). Every page, Server Action and route handler checks the session, the verified email and attendee-list membership. The proxy only does an early cookie check for redirects.
- **Input validation** with Zod on every Server Action. Database access goes through Drizzle's parameterised queries.
- **Capacity** is enforced in an `IMMEDIATE` SQLite transaction, so two people can never take the last seat. Covered by `src/lib/enrollment.test.ts`.
- **Headers:** a per-request nonce-based CSP (`strict-dynamic`, `frame-ancestors 'none'`), HSTS, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, COOP/CORP. `X-Powered-By` is disabled.
- **Email** is plain text only. Secrets are validated at startup and never sent to the client (`server-only` imports).
- **Accepted trade-off:** `style-src` allows `'unsafe-inline'` because React Aria positions overlays with inline styles. Scripts stay nonce-only.
