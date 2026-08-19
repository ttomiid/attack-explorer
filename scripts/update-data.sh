#!/usr/bin/env bash
# Descarga el último bundle STIX de MITRE ATT&CK Enterprise y regenera
# public/data/attack-data.json. Requiere python3 (solo librería estándar).
set -euo pipefail
cd "$(dirname "$0")"
echo "Descargando enterprise-attack.json desde MITRE (github.com/mitre/cti)…"
curl -sL -o enterprise-attack.json https://raw.githubusercontent.com/mitre/cti/master/enterprise-attack/enterprise-attack.json
echo "Procesando dataset…"
python3 process-attack-data.py
mv attack-data.json ../public/data/attack-data.json
rm -f enterprise-attack.json
echo "Listo: public/data/attack-data.json actualizado."
