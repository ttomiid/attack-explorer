#!/usr/bin/env bash
# Descarga los mapeos oficiales D3FEND <-> ATT&CK desde d3fend.mitre.org y regenera
# public/data/d3fend-mappings.json. Requiere python3 (solo librería estándar).
set -euo pipefail
cd "$(dirname "$0")"
python3 process-d3fend-data.py
mv d3fend-mappings.json ../public/data/d3fend-mappings.json
echo "Listo: public/data/d3fend-mappings.json actualizado."