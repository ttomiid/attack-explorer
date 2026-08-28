"""
Procesa un bundle STIX de ATT&CK (Enterprise, Mobile o ICS) a un JSON compacto para el
frontend. Uso:

    python3 process-attack-data.py --domain enterprise --input enterprise-attack.json --output attack-data-enterprise.json
    python3 process-attack-data.py --domain mobile --input mobile-attack.json --output attack-data-mobile.json
    python3 process-attack-data.py --domain ics --input ics-attack.json --output attack-data-ics.json

Domain-specific: el nombre de la kill chain difiere por dominio ('mitre-attack' en
Enterprise, 'mitre-mobile-attack' en Mobile, 'mitre-ics-attack' en ICS), y Mobile trae
más de un objeto x-mitre-matrix (la matriz principal + "Network-Based Effects"), así que
combinamos los tactic_refs de todas las matrices presentes, ordenando primero la que
tenga más tácticas (la principal).

Además, el source_name usado en external_references para el ID "oficial" (Txxxx) también
difiere por dominio: Enterprise y Mobile usan "mitre-attack", pero ICS usa
"mitre-ics-attack" (ver github.com/mitre-attack/attack-stix-data/issues/63 -- un puñado de
técnicas ICS tienen ese campo mal cargado con "mitre-attack" por error de MITRE; el fallback
en get_ext_id (toma el primer external_id disponible si no encuentra el source_name
esperado) cubre esos casos igual).
"""
import argparse
import json
import os

DOMAIN_KILL_CHAIN = {
    "enterprise": "mitre-attack",
    "mobile": "mitre-mobile-attack",
    "ics": "mitre-ics-attack",
}
DOMAIN_SOURCE_NAME = {
    "enterprise": "mitre-attack",
    "mobile": "mitre-attack",
    "ics": "mitre-ics-attack",
}
DOMAIN_LABEL = {
    "enterprise": "MITRE ATT&CK Enterprise (github.com/mitre/cti)",
    "mobile": "MITRE ATT&CK Mobile (github.com/mitre/cti)",
    "ics": "MITRE ATT&CK ICS (github.com/mitre/cti)",
}


def get_ext_id(o, source):
    for ref in o.get("external_references", []):
        if ref.get("source_name") == source:
            return ref.get("external_id")
    for ref in o.get("external_references", []):
        if "external_id" in ref:
            return ref.get("external_id")
    return None


def get_url(o, source):
    for ref in o.get("external_references", []):
        if ref.get("source_name") == source:
            return ref.get("url")
    # fallback (igual que get_ext_id): cubre el puñado de técnicas ICS con el
    # source_name mal cargado, ver github.com/mitre-attack/attack-stix-data/issues/63
    for ref in o.get("external_references", []):
        if ref.get("external_id") and ref.get("url"):
            return ref.get("url")
    return None


def refs(o, source):
    out = []
    for ref in o.get("external_references", []):
        if ref.get("source_name") == source:
            continue
        if ref.get("url") or ref.get("description"):
            out.append(
                {
                    "source": ref.get("source_name"),
                    "url": ref.get("url"),
                    "description": ref.get("description"),
                }
            )
    return out


def process(objs, domain):
    kill_chain_name = DOMAIN_KILL_CHAIN[domain]
    source_name = DOMAIN_SOURCE_NAME[domain]
    by_id = {o["id"]: o for o in objs}

    # ---- Tactics: combinamos tactic_refs de TODAS las matrices del dominio,
    # ordenando primero la matriz con más tácticas (la "principal") ----
    tactics = []
    for o in objs:
        if o["type"] == "x-mitre-tactic" and not o.get("revoked") and not o.get("x_mitre_deprecated"):
            tactics.append(
                {
                    "shortname": o.get("x_mitre_shortname"),
                    "id": get_ext_id(o, source_name),
                    "name": o["name"],
                    "description": o.get("description", "").strip(),
                }
            )

    matrices = [o for o in objs if o["type"] == "x-mitre-matrix"]
    matrices.sort(key=lambda m: len(m.get("tactic_refs", [])), reverse=True)
    tactic_order = []
    for m in matrices:
        for tid in m.get("tactic_refs", []):
            t = by_id.get(tid)
            if t and t.get("x_mitre_shortname") not in tactic_order:
                tactic_order.append(t.get("x_mitre_shortname"))
    order_map = {sn: i for i, sn in enumerate(tactic_order)}
    tactics.sort(key=lambda t: order_map.get(t["shortname"], 999))

    # ---- Techniques ----
    techniques_raw = [
        o for o in objs if o["type"] == "attack-pattern" and not o.get("revoked") and not o.get("x_mitre_deprecated")
    ]
    techniques = {}
    stix_to_ext = {}
    for o in techniques_raw:
        ext_id = get_ext_id(o, source_name)
        if not ext_id:
            continue
        stix_to_ext[o["id"]] = ext_id
        is_sub = o.get("x_mitre_is_subtechnique", False)
        tech = {
            "id": ext_id,
            "stix_id": o["id"],
            "name": o["name"],
            "description": o.get("description", "").strip(),
            "url": get_url(o, source_name),
            "is_subtechnique": is_sub,
            "parent_id": ext_id.split(".")[0] if is_sub else None,
            "tactics": [
                p["phase_name"] for p in o.get("kill_chain_phases", []) if p.get("kill_chain_name") == kill_chain_name
            ],
            "platforms": o.get("x_mitre_platforms", []),
            "data_sources": o.get("x_mitre_data_sources", []),
            "detection": o.get("x_mitre_detection", "").strip(),
            "permissions_required": o.get("x_mitre_permissions_required", []),
            "defense_bypassed": o.get("x_mitre_defense_bypassed", []),
            "system_requirements": o.get("x_mitre_system_requirements", []),
            "effective_permissions": o.get("x_mitre_effective_permissions", []),
            "network_requirements": o.get("x_mitre_network_requirements"),
            "remote_support": o.get("x_mitre_remote_support"),
            "impact_type": o.get("x_mitre_impact_type", []),
            "tactic_type": o.get("x_mitre_tactic_type", []),  # propio de Mobile (ej. "Post-Adversary Device Access")
            "version": o.get("x_mitre_version"),
            "created": o.get("created", "")[:10],
            "modified": o.get("modified", "")[:10],
            "references": refs(o, source_name),
            "mitigations": [],
            "groups": [],
            "software": [],
            "subtechniques": [],
            "detection_strategies": [],
        }
        techniques[ext_id] = tech

    for t in techniques.values():
        if t["is_subtechnique"] and t["parent_id"] in techniques:
            techniques[t["parent_id"]]["subtechniques"].append(t["id"])

    # ---- Mitigations ----
    mitigations = {}
    for o in objs:
        if o["type"] == "course-of-action" and not o.get("revoked") and not o.get("x_mitre_deprecated"):
            ext_id = get_ext_id(o, source_name)
            if not ext_id:
                continue
            mitigations[o["id"]] = {
                "id": ext_id,
                "name": o["name"],
                "description": o.get("description", "").strip(),
            }

    # ---- Groups (intrusion-set) ----
    groups = {}
    for o in objs:
        if o["type"] == "intrusion-set" and not o.get("revoked") and not o.get("x_mitre_deprecated"):
            ext_id = get_ext_id(o, source_name)
            if not ext_id:
                continue
            groups[o["id"]] = {
                "id": ext_id,
                "name": o["name"],
                "description": o.get("description", "").strip(),
                "aliases": o.get("aliases", []),
            }

    # ---- Software (malware/tool) ----
    software = {}
    for o in objs:
        if o["type"] in ("malware", "tool") and not o.get("revoked") and not o.get("x_mitre_deprecated"):
            ext_id = get_ext_id(o, source_name)
            if not ext_id:
                continue
            software[o["id"]] = {
                "id": ext_id,
                "name": o["name"],
                "type": o["type"],
                "description": o.get("description", "").strip(),
                "aliases": o.get("x_mitre_aliases", []),
                "platforms": o.get("x_mitre_platforms", []),
            }

    # ---- Data components / detection (modelo nuevo) ----
    data_components = {}
    for o in objs:
        if o["type"] == "x-mitre-data-component":
            data_components[o["id"]] = {"name": o["name"], "description": o.get("description", "").strip()}

    detection_strategies = {}
    for o in objs:
        if o["type"] == "x-mitre-detection-strategy":
            detection_strategies[o["id"]] = o

    analytics = {}
    for o in objs:
        if o["type"] == "x-mitre-analytic":
            log_sources = []
            for ls in o.get("x_mitre_log_source_references", []):
                comp = data_components.get(ls.get("x_mitre_data_component_ref"), {})
                log_sources.append(
                    {
                        "name": ls.get("name"),
                        "channel": ls.get("channel"),
                        "data_component": comp.get("name"),
                    }
                )
            analytics[o["id"]] = {
                "id": get_ext_id(o, source_name),
                "name": o.get("name"),
                "description": o.get("description", "").strip(),
                "platforms": o.get("x_mitre_platforms", []),
                "log_sources": log_sources,
            }

    # ---- Relationships ----
    rel_count = 0
    for o in objs:
        if o["type"] != "relationship":
            continue
        rtype = o.get("relationship_type")
        src, tgt = o.get("source_ref", ""), o.get("target_ref", "")
        desc = o.get("description", "").strip()

        if rtype == "mitigates" and src in mitigations and tgt in stix_to_ext:
            tech = techniques[stix_to_ext[tgt]]
            m = mitigations[src]
            tech["mitigations"].append({"id": m["id"], "name": m["name"], "description": desc or m["description"][:400]})
            rel_count += 1

        elif rtype == "uses" and tgt in stix_to_ext:
            tech = techniques[stix_to_ext[tgt]]
            if src in groups:
                g = groups[src]
                tech["groups"].append({"id": g["id"], "name": g["name"], "description": desc})
                rel_count += 1
            elif src in software:
                s = software[src]
                tech["software"].append({"id": s["id"], "name": s["name"], "type": s["type"], "description": desc})
                rel_count += 1

        elif rtype == "detects" and src in detection_strategies and tgt in stix_to_ext:
            tech = techniques[stix_to_ext[tgt]]
            ds = detection_strategies[src]
            ds_analytics = [analytics[ref] for ref in ds.get("x_mitre_analytic_refs", []) if ref in analytics]
            tech["detection_strategies"].append(
                {
                    "id": get_ext_id(ds, source_name),
                    "name": ds.get("name"),
                    "description": ds.get("description", "").strip(),
                    "analytics": ds_analytics,
                }
            )
            rel_count += 1

    print(f"[{domain}] relaciones procesadas: {rel_count}")
    print(f"[{domain}] técnicas: {len(techniques)}, mitigaciones: {len(mitigations)}, grupos: {len(groups)}, software: {len(software)}")

    return {
        "tactics": tactics,
        "techniques": list(techniques.values()),
        "mitigations": list(mitigations.values()),
        "groups": list(groups.values()),
        "software": list(software.values()),
        "meta": {
            "domain": domain,
            "source": DOMAIN_LABEL[domain],
        },
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--domain", required=True, choices=list(DOMAIN_KILL_CHAIN))
    parser.add_argument("--input", required=True, help="bundle STIX descargado (ej. mobile-attack.json)")
    parser.add_argument("--output", required=True, help="ruta del JSON de salida")
    args = parser.parse_args()

    data = json.load(open(args.input, encoding="utf-8"))
    out = process(data["objects"], args.domain)

    with open(args.output, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False)

    print(f"[{args.domain}] tamaño de salida: {os.path.getsize(args.output) / 1024 / 1024:.2f} MB")


if __name__ == "__main__":
    main()