# Deploying on GEWIS infrastructure

Based on `GEWIS/infra`, `GEWIS/k8s-apps`, `GEWIS/cbc-deployments` and `GEWIS/gelift-tracker`, and confirmed by the CBC (Victor Klomp) on 19 November 2026.

## Agreed with the CBC

| Topic | Answer |
| --- | --- |
| Template | Follow `gelift-tracker`. No committee folder needed; the CBC may add a "misc" folder later. |
| Repository and image | `ZiineZ/SymposiumForm` and an image on the personal GHCR are fine. |
| Our responsibility | Only a deploy folder in this repo. `infra` and `k8s-apps` belong to the CBC, but PRs there are welcome. |
| Database | The CBC recommends the **old** Postgres server (most apps still run there), debuggable through `pgadmin.gewis.nl`. The cluster Postgres works and is backed up, but has no debugging interface yet. |
| SMTP | A service account on `smtp.gewis.nl` with send rights on `lustrumsymposium@gewis.nl`. The login user differs from the sender address. |
| Hostname | `symposium.gewis.nl`. DNS is handled by the CBC. |
| Environments | Production only (`symposium-prod`). |
| Sealing secrets | The sealing certificate is at `https://sealed-secrets.gewis.nl/v1/cert.pem` (campus Wi-Fi or eduVPN only). |
| Team access | The CBC arranges Kite/kubectl access to the namespace. |
| Client IP | Trust `X-Real-Ip` (already the case). |
| Containers | No requirements for non-root, limits or probes. Logs do not need to go to Grafana. |
| Migrations | Run them before the app starts (Job or init container), like most ABC projects. |
| GEWIS login (Keycloak) | Only for active members for now, so not usable for attendees. Attendees keep email + password accounts created through invite links. |

## Still open

- **Old Postgres:** host name, port, database name and credentials, and whether TLS is required.
- **SMTP:** the service account's username and password.

## How GEWIS runs apps

- **Cluster:** a 3-node Talos Kubernetes cluster, managed by the CBC through Flux (GitOps). Ingress is Traefik with a cert-manager wildcard certificate for `*.gewis.nl`.
- **Registering an app:** a folder in `GEWIS/k8s-apps` with `source.yaml` (a Flux `GitRepository` pointing at the app's repo), `prod.yaml` (a Flux `Kustomization` with the manifest path and `targetNamespace`) and `rbac-prod/` (a scoped `app-deployer` Role). The CBC adds this; we can send it as a PR.
- **Manifests:** live in the app's repo. Flux applies them as `app-deployer`, which may create deployments, services, configmaps, secrets, PVCs, jobs/cronjobs, Traefik `IngressRoute`/`Middleware`, `SealedSecret`, `SecretStore`/`ExternalSecret`, certificates, HPA, PDB and NetworkPolicy.
- **Pod security:** Talos enforces the PSA `baseline` profile, so no hostPath volumes or privileged containers.

## Sign-ups

GEWIS's privacy policy does not allow sharing the sign-up emails through the radix API. When sign-ups on gewis.nl close, the organisers email everyone an invite link made in the admin dashboard. Only invite links let people create an account.

## What is done in this app

- **Database:** Postgres (Drizzle `node-postgres`, Better Auth `provider: "pg"`). Seat booking locks the user and session rows; tests run on PGlite.
- **Mail:** `SMTP_USER` is the service account, `MAIL_FROM` is `lustrumsymposium@gewis.nl` (set in the overlay).
- **Container:** standalone Next.js image on GHCR, non-root, read-only root filesystem; `/api/health` and `/api/ready` probes.
- **Migrations:** the `migrate` init container runs `node dist/migrate.mjs` before each new pod.
- **Manifests:** `deploy/kustomize` (base + `overlays/production`), with the IngressRoute for `symposium.gewis.nl` and a sealing script. See `deploy/kustomize/README.md`.

## Still to do

- Fill in and seal the secrets once the CBC has sent the database and SMTP credentials.
- Make the GHCR package public.
- PR to `GEWIS/k8s-apps` registering `deploy/kustomize/overlays/production` with `targetNamespace: symposium-prod`.
