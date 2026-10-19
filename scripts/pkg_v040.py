"""package.json v0.4.0 for openmemory (BOM-tolerant)."""
import json

pj_path = '/tmp/openmemory-main/package.json'
raw = open(pj_path, encoding='utf-8-sig').read()
pj = json.loads(raw)
pj['version'] = '0.4.0'
pj['description'] = ('Embedded cognee long-term memory for OpenCode — slash command per memory, '
                    'in-process graph (@ladybugdb/core), no server')
pj.setdefault('optionalDependencies', {})['@ladybugdb/core'] = '0.19.0'
pj['files'] = [f for f in pj['files'] if f != 'graph-server.py']
if 'graph.cjs' not in pj['files']:
    pj['files'].insert(pj['files'].index('cognee-memory-add.cjs') + 1, 'graph.cjs')
with open(pj_path, 'w', encoding='utf-8') as f:
    json.dump(pj, f, indent=2, ensure_ascii=False)
    f.write('\n')
print('package.json ->', pj['version'], '| files:', pj['files'], '| optDeps:', pj['optionalDependencies'])
