"""Fix nested-quote bug in index.ts + package.json for v0.4.0."""

# 1. Fix nested-quote bug in index.ts description
p = '/tmp/openmemory-main/index.ts'
ts = open(p).read()
bad = '"Cypher parameters, e.g. { "t": "iso/iec 12207" }", additionalProperties: true }'
good = '"Cypher parameters, e.g. { \\"t\\": \\"iso/iec 12207\\" }", additionalProperties: true }'
assert bad in ts, 'nested-quote pattern not found'
ts = ts.replace(bad, good)
open(p, 'w').write(ts)
print('fixed nested quotes in index.ts')

# 2. package.json: 0.4.0 + graph.cjs + optionalDependencies
import json
pj_path = '/tmp/openmemory-main/package.json'
raw = open(pj_path, encoding='utf-8').lstrip('\\ufeff\u00c2')
pj = json.loads(raw)
pj['version'] = '0.4.0'
pj['description'] = 'Embedded cognee long-term memory for OpenCode — slash command per memory, in-process graph (@ladybugdb/core), no server'
pj.setdefault('optionalDependencies', {})['@ladybugdb/core'] = '0.19.0'
pj['files'] = [f for f in pj['files'] if f != 'graph-server.py']
if 'graph.cjs' not in pj['files']:
    pj['files'].insert(pj['files'].index('cognee-memory-add.cjs') + 1, 'graph.cjs')
open(pj_path, 'w', encoding='utf-8').write(json.dumps(pj, indent=2, ensure_ascii=False) + '\n')
print('package.json ->', pj['version'])

# 3. Verify index.ts syntax-ish: balanced braces count + no stray backtick issues
ts2 = open(p).read()
assert ts2.count('{') == ts2.count('}'), 'brace mismatch!'
assert 'noop.js"' in ts2
print('index.ts sanity checks pass;', len(ts2.splitlines()), 'lines')
