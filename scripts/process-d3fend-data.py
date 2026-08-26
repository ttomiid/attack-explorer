"""
Descarga los datos oficiales de MITRE D3FEND y genera public/data/d3fend-mappings.json:
un diccionario {technique_id: [contramedidas D3FEND]} para el framework Enterprise.

Fuentes (MITRE D3FEND, d3fend.mitre.org):
- d3fend.csv               -> catálogo de técnicas D3FEND (ID, táctica, nombre, definición)
- d3fend-full-mappings.csv -> relaciones inferidas D3FEND <-> ATT&CK/ICS/SPARTA/ATLAS

Solo usa la librería estándar de Python (csv, json, urllib), igual que process-attack-data.py.
"""
import csv
import io
import json
import sys
import urllib.request

CATALOG_URL = "https://d3fend.mitre.org/ontologies/d3fend.csv"
MAPPINGS_URL = "https://d3fend.mitre.org/api/ontology/inference/d3fend-full-mappings.csv"
ENTERPRISE_ROOT = "http://d3fend.mitre.org/ontologies/d3fend.owl#ATTACKEnterpriseTechnique"

HEADERS = {"User-Agent": "attack-explorer-data-pipeline (github.com/ttomiid/attack-explorer)"}


def fetch_csv(url):
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=120) as resp:
        raw = resp.read().decode("utf-8-sig")
    return list(csv.DictReader(io.StringIO(raw)))


def technique_id_from_uri(uri):
    """http://d3fend.mitre.org/ontologies/d3fend.owl#CredentialHardening -> CredentialHardening"""
    return uri.rsplit("#", 1)[-1] if uri else None


def build_catalog(rows):
    """
    d3fend.csv es una tabla jerárquica: cada fila representa una técnica en algún
    nivel (columna 'D3FEND Technique', 'D3FEND Technique Level 0' o '...Level 1',
    la que esté no-vacía es el nombre de ESA fila). Armamos name -> {id, tactic, definition}.
    """
    catalog = {}
    for row in rows:
        name = (
            row.get("D3FEND Technique")
            or row.get("D3FEND Technique Level 0")
            or row.get("D3FEND Technique Level 1")
            or ""
        ).strip()
        if not name:
            continue
        catalog[name] = {
            "id": row.get("ID", "").strip(),
            "tactic": row.get("D3FEND Tactic", "").strip(),
            "definition": (row.get("Definition") or "").strip(),
        }
    return catalog


def build_mappings(rows, catalog):
    # técnica ATT&CK -> { nombre D3FEND -> {info + set de mecanismos únicos} }
    by_technique = {}

    for row in rows:
        if row.get("framework_root_iri") != ENTERPRISE_ROOT:
            continue  # nos quedamos solo con ATT&CK Enterprise (mismo alcance que attack-data.json)

        off_tech_id = row.get("off_tech_id", "").strip()
        def_name = row.get("def_tech_label", "").strip()
        if not off_tech_id or not def_name:
            continue

        catalog_entry = catalog.get(def_name, {})
        bucket = by_technique.setdefault(off_tech_id, {})
        entry = bucket.setdefault(
            def_name,
            {
                "id": catalog_entry.get("id", ""),
                "name": def_name,
                "tactic": catalog_entry.get("tactic", row.get("def_tactic_label", "")),
                "definition": catalog_entry.get("definition", ""),
                "url": None,
                "mechanisms": set(),
            },
        )

        def_tech_uri = row.get("def_tech", "")
        if not entry["url"] and def_tech_uri:
            class_name = technique_id_from_uri(def_tech_uri)
            entry["url"] = f"https://d3fend.mitre.org/technique/d3f:{class_name}/"

        def_rel = row.get("def_artifact_rel_label", "").strip()
        def_artifact = row.get("def_artifact_label", "").strip()
        off_rel = row.get("off_artifact_rel_label", "").strip()
        off_artifact = row.get("off_artifact_label", "").strip()
        if def_rel and def_artifact and off_rel and off_artifact:
            entry["mechanisms"].add((def_rel, def_artifact, off_rel, off_artifact))

    # aplanar: sets -> listas ordenadas, dict -> lista ordenada por táctica/nombre
    TACTIC_ORDER = ["Model", "Harden", "Detect", "Isolate", "Deceive", "Evict", "Restore"]

    output = {}
    for tech_id, defenses in by_technique.items():
        items = []
        for d in defenses.values():
            mech_list = [
                {"defends": r, "defended_artifact": da, "attack_rel": ar, "attack_artifact": aa}
                for (r, da, ar, aa) in sorted(d["mechanisms"])
            ][:4]  # tope de 4 mecanismos por contramedida, alcanza para justificar la recomendación
            items.append(
                {
                    "id": d["id"],
                    "name": d["name"],
                    "tactic": d["tactic"],
                    "definition": d["definition"],
                    "url": d["url"],
                    "mechanisms": mech_list,
                }
            )
        items.sort(
            key=lambda x: (
                TACTIC_ORDER.index(x["tactic"]) if x["tactic"] in TACTIC_ORDER else 99,
                x["name"],
            )
        )
        output[tech_id] = items

    return output


def main():
    print("Descargando catálogo de técnicas D3FEND...", file=sys.stderr)
    catalog = build_catalog(fetch_csv(CATALOG_URL))
    print(f"  {len(catalog)} técnicas D3FEND en el catálogo", file=sys.stderr)

    print("Descargando mapeos D3FEND <-> ATT&CK...", file=sys.stderr)
    mapping_rows = fetch_csv(MAPPINGS_URL)
    print(f"  {len(mapping_rows)} filas de relaciones inferidas", file=sys.stderr)

    mappings = build_mappings(mapping_rows, catalog)
    print(f"  {len(mappings)} técnicas ATT&CK con contramedidas D3FEND asociadas", file=sys.stderr)

    with open("d3fend-mappings.json", "w", encoding="utf-8") as f:
        json.dump(mappings, f, ensure_ascii=False)

    print("Listo: d3fend-mappings.json", file=sys.stderr)


if __name__ == "__main__":
    main()