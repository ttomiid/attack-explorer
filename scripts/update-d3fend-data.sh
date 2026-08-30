#!/usr/bin/env bash
# Descarga los mapeos oficiales D3FEND <-> ATT&CK desde d3fend.mitre.org y regenera
# public/data/d3fend-mappings-{enterprise,mobile,ics}.json. Requiere python3 (solo
# libreria estandar).
set -euo pipefail
cd "$(dirname "$0")"
python3 process-d3fend-data.py
mv d3fend-mappings-enterprise.json ../public/data/d3fend-mappings-enterprise.json
mv d3fend-mappings-mobile.json ../public/data/d3fend-mappings-mobile.json
mv d3fend-mappings-ics.json ../public/data/d3fend-mappings-ics.json
rm -f ../public/data/d3fend-mappings.json  # nombre viejo, sin dominio: ya no lo usa la app
echo "Listo: public/data/d3fend-mappings-{enterprise,mobile,ics}.json actualizados."