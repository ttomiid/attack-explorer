import json, re

data = json.load(open('enterprise-attack.json'))
objs = data['objects']

def get_ext_id(o, source='mitre-attack'):
    for ref in o.get('external_references', []):
        if ref.get('source_name') == source:
            return ref.get('external_id')
    for ref in o.get('external_references', []):
        if 'external_id' in ref:
            return ref.get('external_id')
    return None

def get_url(o):
    for ref in o.get('external_references', []):
        if ref.get('source_name') == 'mitre-attack':
            return ref.get('url')
    return None

def refs(o):
    out = []
    for ref in o.get('external_references', []):
        if ref.get('source_name') in ('mitre-attack',):
            continue
        if ref.get('url') or ref.get('description'):
            out.append({
                'source': ref.get('source_name'),
                'url': ref.get('url'),
                'description': ref.get('description')
            })
    return out

by_id = {o['id']: o for o in objs}

# ---- Tactics ----
tactics = []
for o in objs:
    if o['type'] == 'x-mitre-tactic' and not o.get('revoked') and not o.get('x_mitre_deprecated'):
        tactics.append({
            'shortname': o.get('x_mitre_shortname'),
            'id': get_ext_id(o),
            'name': o['name'],
            'description': o.get('description', '').strip(),
        })

# order tactics by the enterprise matrix
matrix = next(o for o in objs if o['type'] == 'x-mitre-matrix')
tactic_order = []
for tid in matrix.get('tactic_refs', []):
    t = by_id.get(tid)
    if t:
        tactic_order.append(t.get('x_mitre_shortname'))
order_map = {sn: i for i, sn in enumerate(tactic_order)}
tactics.sort(key=lambda t: order_map.get(t['shortname'], 999))

# ---- Techniques ----
techniques_raw = [o for o in objs if o['type'] == 'attack-pattern' and not o.get('revoked') and not o.get('x_mitre_deprecated')]
techniques = {}
stix_to_ext = {}
for o in techniques_raw:
    ext_id = get_ext_id(o)
    if not ext_id:
        continue
    stix_to_ext[o['id']] = ext_id
    is_sub = o.get('x_mitre_is_subtechnique', False)
    tech = {
        'id': ext_id,
        'stix_id': o['id'],
        'name': o['name'],
        'description': o.get('description', '').strip(),
        'url': get_url(o),
        'is_subtechnique': is_sub,
        'parent_id': ext_id.split('.')[0] if is_sub else None,
        'tactics': [p['phase_name'] for p in o.get('kill_chain_phases', []) if p.get('kill_chain_name') == 'mitre-attack'],
        'platforms': o.get('x_mitre_platforms', []),
        'data_sources': o.get('x_mitre_data_sources', []),
        'detection': o.get('x_mitre_detection', '').strip(),
        'permissions_required': o.get('x_mitre_permissions_required', []),
        'defense_bypassed': o.get('x_mitre_defense_bypassed', []),
        'system_requirements': o.get('x_mitre_system_requirements', []),
        'effective_permissions': o.get('x_mitre_effective_permissions', []),
        'network_requirements': o.get('x_mitre_network_requirements'),
        'remote_support': o.get('x_mitre_remote_support'),
        'impact_type': o.get('x_mitre_impact_type', []),
        'version': o.get('x_mitre_version'),
        'created': o.get('created', '')[:10],
        'modified': o.get('modified', '')[:10],
        'references': refs(o),
        'mitigations': [],
        'groups': [],
        'software': [],
        'subtechniques': [],
        'detection_strategies': [],
    }
    techniques[ext_id] = tech

for t in techniques.values():
    if t['is_subtechnique'] and t['parent_id'] in techniques:
        techniques[t['parent_id']]['subtechniques'].append(t['id'])

# ---- Mitigations ----
mitigations = {}
for o in objs:
    if o['type'] == 'course-of-action' and not o.get('revoked') and not o.get('x_mitre_deprecated'):
        ext_id = get_ext_id(o)
        if not ext_id:
            continue
        mitigations[o['id']] = {
            'id': ext_id,
            'name': o['name'],
            'description': o.get('description', '').strip(),
        }

# ---- Groups (intrusion-set) ----
groups = {}
for o in objs:
    if o['type'] == 'intrusion-set' and not o.get('revoked') and not o.get('x_mitre_deprecated'):
        ext_id = get_ext_id(o)
        if not ext_id:
            continue
        groups[o['id']] = {
            'id': ext_id,
            'name': o['name'],
            'description': o.get('description', '').strip(),
            'aliases': o.get('aliases', []),
        }

# ---- Software (malware/tool) ----
software = {}
for o in objs:
    if o['type'] in ('malware', 'tool') and not o.get('revoked') and not o.get('x_mitre_deprecated'):
        ext_id = get_ext_id(o)
        if not ext_id:
            continue
        software[o['id']] = {
            'id': ext_id,
            'name': o['name'],
            'type': o['type'],
            'description': o.get('description', '').strip(),
            'aliases': o.get('x_mitre_aliases', []),
            'platforms': o.get('x_mitre_platforms', []),
        }

# ---- Data components / detection (new model) ----
data_components = {}
for o in objs:
    if o['type'] == 'x-mitre-data-component':
        data_components[o['id']] = {'name': o['name'], 'description': o.get('description','').strip()}

detection_strategies = {}
for o in objs:
    if o['type'] == 'x-mitre-detection-strategy':
        detection_strategies[o['id']] = o

analytics = {}
for o in objs:
    if o['type'] == 'x-mitre-analytic':
        log_sources = []
        for ls in o.get('x_mitre_log_source_references', []):
            comp = data_components.get(ls.get('x_mitre_data_component_ref'), {})
            log_sources.append({
                'name': ls.get('name'),
                'channel': ls.get('channel'),
                'data_component': comp.get('name'),
            })
        analytics[o['id']] = {
            'id': get_ext_id(o),
            'name': o.get('name'),
            'description': o.get('description', '').strip(),
            'platforms': o.get('x_mitre_platforms', []),
            'log_sources': log_sources,
        }

# map detection-strategy -> technique via 'detects' relationship (source=detection-strategy target=attack-pattern)
# and analytic -> data-component via relationship? Let's just attach detection strategy summary + analytics list to technique.

# ---- Relationships ----
rel_count = 0
for o in objs:
    if o['type'] != 'relationship':
        continue
    rtype = o.get('relationship_type')
    src, tgt = o.get('source_ref',''), o.get('target_ref','')
    desc = o.get('description', '').strip()

    if rtype == 'mitigates' and src in mitigations and tgt in stix_to_ext:
        tech = techniques[stix_to_ext[tgt]]
        m = mitigations[src]
        tech['mitigations'].append({'id': m['id'], 'name': m['name'], 'description': desc or m['description'][:400]})
        rel_count += 1

    elif rtype == 'uses' and tgt in stix_to_ext:
        tech = techniques[stix_to_ext[tgt]]
        if src in groups:
            g = groups[src]
            tech['groups'].append({'id': g['id'], 'name': g['name'], 'description': desc})
            rel_count += 1
        elif src in software:
            s = software[src]
            tech['software'].append({'id': s['id'], 'name': s['name'], 'type': s['type'], 'description': desc})
            rel_count += 1

    elif rtype == 'detects' and src in detection_strategies and tgt in stix_to_ext:
        tech = techniques[stix_to_ext[tgt]]
        ds = detection_strategies[src]
        ds_analytics = [analytics[ref] for ref in ds.get('x_mitre_analytic_refs', []) if ref in analytics]
        tech['detection_strategies'].append({
            'id': get_ext_id(ds),
            'name': ds.get('name'),
            'description': ds.get('description', '').strip(),
            'analytics': ds_analytics,
        })
        rel_count += 1

print('relationships processed:', rel_count)
print('techniques:', len(techniques))
print('mitigations:', len(mitigations))
print('groups:', len(groups))
print('software:', len(software))

out = {
    'tactics': tactics,
    'techniques': list(techniques.values()),
    'mitigations': list(mitigations.values()),
    'groups': list(groups.values()),
    'software': list(software.values()),
    'meta': {
        'version': data.get('objects',[{}])[0].get('x_mitre_version') if False else None,
        'source': 'MITRE ATT&CK Enterprise (github.com/mitre/cti)',
    }
}

with open('attack-data.json', 'w') as f:
    json.dump(out, f, ensure_ascii=False)

import os
print('output size MB:', os.path.getsize('attack-data.json')/1024/1024)
