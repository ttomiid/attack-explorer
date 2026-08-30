#!/usr/bin/env bash
# Descarga los bundles STIX de MITRE ATT&CK (Enterprise + Mobile + ICS) y regenera
# public/data/attack-data-<domain>.json para cada uno. Requiere python3 (solo
# libreria estandar).
set -euo pipefail
cd "$(dirname "$0")"

declare -A SOURCE_URL=(
  [enterprise]="https://raw.githubusercontent.com/mitre/cti/master/enterprise-attack/enterprise-attack.json"
  [mobile]="https://raw.githubusercontent.com/mitre/cti/master/mobile-attack/mobile-attack.json"
  [ics]="https://raw.githubusercontent.com/mitre/cti/master/ics-attack/ics-attack.json"
)

for domain in enterprise mobile ics; do
  echo "[$domain] Descargando bundle STIX..."
  curl -sL -o "${domain}-attack.json" "${SOURCE_URL[$domain]}"
  echo "[$domain] Procesando dataset..."
  python3 process-attack-data.py --domain "$domain" --input "${domain}-attack.json" --output "attack-data-${domain}.json"
  mv "attack-data-${domain}.json" "../public/data/attack-data-${domain}.json"
  rm -f "${domain}-attack.json"
done

echo "Listo: public/data/attack-data-{enterprise,mobile,ics}.json actualizados."