#!/usr/bin/env bash
# Seals symposium-secrets.yaml with the GEWIS cluster key (campus Wi-Fi or eduVPN needed).
set -euo pipefail
cd "$(dirname "$0")"

plain=symposium-secrets.yaml
out=../overlays/production/sealed-secrets.yaml

[[ -f $plain ]] || { echo "Missing $plain: copy symposium-secrets.template.yaml and fill it in." >&2; exit 1; }
if grep -q "REPLACE_ME\|USER:PASSWORD@HOST" "$plain"; then
  echo "$plain still contains placeholders." >&2
  exit 1
fi
command -v kubeseal >/dev/null || { echo "Install kubeseal first: brew install kubeseal" >&2; exit 1; }

curl -fsS https://sealed-secrets.gewis.nl/v1/cert.pem -o cert.pem
kubeseal --cert cert.pem --scope namespace-wide --format yaml <"$plain" >"$out"
rm -f cert.pem

echo "Wrote $out. Delete $plain now; it holds the secrets in plain text."
