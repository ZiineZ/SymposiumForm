# Deploying on GEWIS infrastructure

Findings from reading `GEWIS/infra`, `GEWIS/k8s-apps`, `GEWIS/cbc-deployments`, `GEWIS/gelift-tracker` and `GEWIS/radix` (November 2026). Nothing here has been confirmed with the CBC yet.

## How GEWIS runs apps

- **Cluster:** a 3-node Talos Kubernetes cluster, managed by the CBC through Flux (GitOps). Ingress is Traefik, TLS comes from a cert-manager wildcard (`*.gewis.nl`, `*.test.gewis.nl`), and external-dns writes DNS records to Cloudflare.
- **Registering an app:** every app is a folder in `GEWIS/k8s-apps` with three parts:
  - `source.yaml`: a Flux `GitRepository` pointing at the app's repo
  - `prod.yaml`: a Flux `Kustomization` with the manifest path, `targetNamespace: <app>-prod` and the namespace itself
  - `rbac-prod/`: a scoped `app-deployer` Role
- **Where manifests live:** in the app's own repo. Flux applies them as `app-deployer`, which may only create deployments, services, configmaps, secrets, PVCs, jobs/cronjobs, Traefik `IngressRoute`/`Middleware`, `SealedSecret`, `SecretStore`/`ExternalSecret`, certificates, HPA, PDB and NetworkPolicy.
- **Closest template: `gelift-tracker`.** It has its own repo, a GHCR image built by GitHub Actions (`ghcr.io/gewis/gelift-tracker`), Kustomize under `deploy/kustomize/{base,overlays}`, a SealedSecret for its credentials, and a top-level entry in `k8s-apps`.
- **Secrets:**
  - App secrets are `SealedSecret`s, sealed with the cert from `https://sealed-secrets.gewis.nl/v1/cert.pem` (reachable from the GEWIS network only).
  - Generated credentials (Postgres, Keycloak clients, S3) live in OpenBao. The namespace reads them through a `SecretStore` + `ExternalSecret`.
- **Pod security:** Talos enforces the PSA `baseline` profile. The container must run as non-root, with no hostPath volumes.
- **Logs and metrics:** Alloy collects pod stdout into the LGTM stack (Grafana). The stack is split into separate tenants.
- **Team access:** Kite UI and `kubectl` over NetBird. Both are granted per AD group in `infra/flux/50_apps/kite/app-access.yaml`.

## Postgres

- **Server:** one shared CloudNativePG cluster at **`postgres.net.gewis.nl:5432`**. TLS is mandatory and clients use `sslmode=verify-full`; it's a Let's Encrypt certificate, so the system CAs are enough.
- **Getting a database:** the CBC adds one line to `infra/terraform/40_databases/postgres.tf`:
  ```hcl
  symposium = { namespace = "symposium-prod" }
  ```
- **What that line creates:**
  - the role and the database
  - a password in OpenBao at `postgres/symposium-prod/symposium`, with fields `username`, `password`, `dbname`, `host` and `port`
  - the Kubernetes auth role `postgres-symposium-prod`
- **Reading it from the app:** the same way as `cbc-deployments/mattermost/postgres-external-secret.yaml`, templated into a `DATABASE_URL`.
- **Backups:** handled by the cluster (Barman to S3).
- **Possible self-service:** the `app-deployer` Role also allows a `databases.gewis.nl/PostgresDatabase` CRD. That may become a self-service alternative; ask the CBC.

## SMTP

- **Server:** other apps send through **`smtp.gewis.nl:587`** with STARTTLS and SMTP auth. Mattermost does this, with its credentials in its SealedSecret.
- **To ask for:** an SMTP account and a sender address, for example `symposium@gewis.nl`. SPF and DKIM for `gewis.nl` stay with GEWIS.

## Sign-ups (decided)

GEWIS's privacy policy does not allow sharing the sign-up emails through the radix API. Instead:

- When sign-ups on gewis.nl close, the organisers email everyone an **invite link**. Only that link lets people create an account.
- Links are made in the admin dashboard. Each one has an expiry date and an optional maximum number of uses, and can be revoked. The admin can make more links later, for example for late sign-ups.
- So the site needs nothing from radix, and no attendee data is copied from GEWIS.

## Networking details that affect the app

- **Ingress:** a Traefik `IngressRoute` on entryPoint `websecure` with `tls: {}`, which uses the shared wildcard certificate. Public DNS needs the annotation `external-dns.alpha.kubernetes.io/target: router02.net.gewis.nl` on the route.
- **Client IP:**
  - Traefik replaces any client-sent `X-Forwarded-For`, but the TU/e WAF in front may pass a client-controlled chain.
  - GEWIS's own `real-ip` plugin always sets a trustworthy **`X-Real-Ip`**.
  - Better Auth's rate limiter must read `x-real-ip`, not `x-forwarded-for`.

## What changes in this app (later, once agreed)

- **Database:** SQLite → Postgres.
  - Drizzle `pg` driver, Better Auth adapter `provider: "pg"`, migrations regenerated.
  - Enrollment locks the timeslot row (`SELECT … FOR UPDATE`) instead of SQLite's `IMMEDIATE` transaction.
  - Tests run against Postgres.
- **Migrations:** a Kubernetes `Job` or init container runs them before the app starts.
- **Container:** `output: "standalone"`, a non-root `Dockerfile`, a `/api/health` endpoint for the probes, and a GitHub Action publishing to GHCR.
- **Manifests:** `deploy/kustomize`, following `gelift-tracker`:
  - Deployment, Service and IngressRoute
  - SealedSecret holding `BETTER_AUTH_SECRET`, the SMTP credentials and the admin hashes (`ADMIN_USERNAME_SHA256`, `ADMIN_PASSWORD_HASH`)
  - Postgres SecretStore + ExternalSecret
- **Better Auth:** the production `BETTER_AUTH_URL`. (Client IPs are already read from `X-Real-Ip`.)
- **Programme data:** seeded with a Job, or the seed script run through `kubectl exec`.
