# Kubernetes deployment

Deployed by Flux on the GEWIS cluster from `overlays/production`, into the namespace `symposium-prod`, at `https://symposium.gewis.nl`. The structure follows `GEWIS/gelift-tracker`.

```
deploy/kustomize/
├── base/                    Deployment (with a migration init container) and Service
├── overlays/production/     Route for symposium.gewis.nl, settings, sealed secrets
└── secrets/                 Template and script for sealing the secrets
```

The image is `ghcr.io/ziinez/symposiumform`, built by `.github/workflows/container.yml` on every push to `master`.

## Before the first deploy

1. **Make the image public.** GitHub → your profile → Packages → `symposiumform` → Package settings → Change visibility → Public. The cluster has no credentials to pull private images.
2. **Seal the secrets** (campus Wi-Fi or eduVPN):
   ```bash
   brew install kubeseal
   cd deploy/kustomize/secrets
   cp symposium-secrets.template.yaml symposium-secrets.yaml   # git-ignored; fill in every value
   ./seal.sh                                                   # writes overlays/production/sealed-secrets.yaml
   rm symposium-secrets.yaml
   ```
   Commit `overlays/production/sealed-secrets.yaml`. Only the cluster can decrypt it.
3. **Register the app** in `GEWIS/k8s-apps` (a PR to the CBC): a `GitRepository` for this repo and a Flux `Kustomization` with `path: ./deploy/kustomize/overlays/production` and `targetNamespace: symposium-prod`.

The overlay refers to `sealed-secrets.yaml`, so it does not build until step 2 is done.

## Releasing

Every push to `master` publishes `latest` and `sha-<commit>`. Pods pull `latest` when they start, so restart the deployment to roll out (delete the pod in Kite, or `kubectl -n symposium-prod rollout restart deploy/symposium`).

To pin an exact version instead, set `newTag: sha-<commit>` in `overlays/production/kustomization.yaml` and push. Flux then rolls it out.

Migrations run in the `migrate` init container before each new pod starts.

## Changing settings or secrets

- Non-secret settings (URL, SMTP host, sender address) are in `configMapGenerator` in the overlay.
- Secrets: fill in the template again, run `./seal.sh`, commit. A rotated `BETTER_AUTH_SECRET` signs everyone out.

## Checking the manifests locally

```bash
kubectl kustomize deploy/kustomize/overlays/production
```
