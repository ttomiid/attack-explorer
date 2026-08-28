import csv, io, sys, urllib.request

MAPPINGS_URL = "https://d3fend.mitre.org/api/ontology/inference/d3fend-full-mappings.csv"
HEADERS = {"User-Agent": "attack-explorer-data-pipeline (github.com/ttomiid/attack-explorer)"}

req = urllib.request.Request(MAPPINGS_URL, headers=HEADERS)
with urllib.request.urlopen(req, timeout=120) as resp:
    raw = resp.read().decode("utf-8-sig")
rows = list(csv.DictReader(io.StringIO(raw)))

roots = {}
for row in rows:
    r = row.get("framework_root_iri", "")
    roots[r] = roots.get(r, 0) + 1

for r, count in sorted(roots.items(), key=lambda x: -x[1]):
    print(f"{count:>6}  {r}")
