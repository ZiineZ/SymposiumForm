# GEWIS Lustrum Symposium

Sign-up site for the GEWIS Lustrum Symposium (*Hidden Gems*, Evoluon). Attendees create an account through an invite link, see their personal schedule and subscribe to speaker sessions. Organisers run everything from an admin dashboard.

**Stack:** Next.js 16 (App Router) · HeroUI v3 · Tailwind CSS v4 · Better Auth · Drizzle ORM · SQLite

## How it works

- **Accounts:** people create an account only through an **invite link** (`/join/<token>`), which you make in the admin dashboard. A link has an expiry date, an optional maximum number of uses, and can be revoked. Accounts need a verified email address.
- **Schedule (`/`):** the general programme plus the talks the attendee subscribed to. *Add to calendar* downloads an `.ics` file.
- **Speakers (`/speakers`):** each speaker has one or more sessions, each with a time, a room and a capacity. People can attend at most one session per speaker, and never two sessions that overlap. Seats go first come, first served.
- **Notifications:** messages from the organisers appear under the header until the attendee reads them; `/notifications` lists them all.
- **Admin (`/admin`):** manage speakers, sessions (time, room, capacity), subscribers, the general programme, notifications, invite links, accounts and when subscribing opens and closes.

## Local development

```bash
npm install
cp .env.example .env.local          # fill in BETTER_AUTH_SECRET (openssl rand -base64 48)
npm run admin:credentials -- --save  # writes the two ADMIN_ hashes into .env.local
npm run db:migrate
npm run program:seed                # optional: load content/program.json
npm run dev
```

Then sign in at `/admin/login`, create an invite link under **Invites**, and open it to create an attendee account. Without `SMTP_HOST`, verification and reset emails are printed to the dev server console.

## The admin account

There is one admin login, separate from attendee accounts and without an email address.

- `npm run admin:credentials` generates a random 32-character username and 32-character password, prints them **once**, and prints two environment variables: `ADMIN_USERNAME_SHA256` and `ADMIN_PASSWORD_HASH`. Store the username and password in a password manager. Only the hashes go into the environment, so neither can be recovered from the server.
- To change them, run the script again and replace both variables.
- Sessions last at most 8 hours and end after 30 minutes of inactivity. The cookie is `HttpOnly`, `SameSite=Strict` and `__Host-` prefixed in production.
- Sign-in is limited to 5 attempts per client and 50 in total per 5 minutes.
- Every admin change is logged as an `[admin]` line on stdout.

## Managing data

| Task | Where |
| --- | --- |
| Speakers, sessions, rooms, capacities, subscribers | Admin → Speakers |
| General programme (opening, lunch, drinks) | Admin → Schedule |
| Messages to all attendees | Admin → Notifications |
| Account-creation links | Admin → Invites |
| Remove an account | Admin → Users |
| When subscribing opens and closes | Admin → Settings |
| Initial programme in bulk | `content/program.json`, then `npm run program:seed` |
| Apply database migrations | `npm run db:migrate` |
| After changing `src/db/schema.ts` | `npm run db:generate` and commit `drizzle/` |

> `content/program.json` holds **placeholder** speakers and a placeholder date (17 March 2027).

## Checks

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## Deployment

Run it as a long-lived Node server (`npm run build && npm start`), for example on a VPS or in a container, **not** on serverless hosting: the SQLite database is a local file.

1. Set the environment variables from `.env.example` as real environment variables (the admin hashes belong in a secret). In production the app refuses to start without `SMTP_HOST` and an `https://` `BETTER_AUTH_URL`.
2. Put `DATABASE_PATH` on persistent storage and back it up.
3. Run `npm run db:migrate` on every deploy, before starting the server.
4. Serve it behind a reverse proxy that terminates TLS and sets `X-Real-Ip` (Traefik on the GEWIS cluster does). The rate limiters identify clients by that header, so don't expose the Node port directly.

## Security

- **Authentication** with [Better Auth](https://better-auth.com): scrypt password hashing, required email verification, single-use expiring reset links, and all sessions revoked on a password reset. Origin checks block CSRF and open redirects.
- **Rate limiting** on all auth endpoints, stored in the database (sign-in: 5 per minute; sign-up, resets, verification mails: a few per 10 minutes).
- **Invite-only sign-up:** the invite token is checked and used up inside the account-creation hook in one atomic `UPDATE`; only its SHA-256 is stored and the link is shown once.
- **No account enumeration:** sign-up for an existing address and password reset respond the same whether or not the account exists.
- **Authorization** in one place per role: `src/lib/dal.ts` for attendees, `src/lib/admin-auth.ts` for the admin. Every page, Server Action and route handler checks it again; the proxy only does an early cookie check for redirects.
- **Admin login** is separate from attendee accounts: hashed credentials from the environment, constant-time comparison, throttling, short server-side sessions. See *The admin account*.
- **Notifications** are plain text rendered by React, so HTML in a message is shown, never executed.
- **Input validation** with Zod on every Server Action. Database access goes through Drizzle's parameterised queries.
- **Capacity** is enforced in an `IMMEDIATE` SQLite transaction, so two people can never take the last seat. Covered by `src/lib/enrollment.test.ts`.
- **Headers:** a per-request nonce-based CSP (`strict-dynamic`, `frame-ancestors 'none'`), HSTS, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, COOP/CORP. `X-Powered-By` is disabled.
- **Email** is plain text only. Secrets are validated at startup and never sent to the client (`server-only` imports).
- **Accepted trade-off:** `style-src` allows `'unsafe-inline'` because React Aria positions overlays with inline styles. Scripts stay nonce-only.
