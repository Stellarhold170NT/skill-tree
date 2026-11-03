"""Generate v0.3.0 -> v0.4.0 unified patch + copy final tree to VFS-visible dir."""
import difflib
import os
import shutil

ORIG = '/tmp/om-original'
NEW = '/tmp/openmemory-main'
OUT = '/workspace/openmemory-v040'
os.makedirs(OUT, exist_ok=True)

files = ['index.ts', 'cognee-recall.cjs', 'graph.cjs', 'package.json', 'README.md', 'skills/cognee-memory/SKILL.md']
patch_lines = []
for f in files:
    op = os.path.join(ORIG, f)
    np = os.path.join(NEW, f)
    a = open(op, encoding='utf-8').read().splitlines(keepends=True) if os.path.exists(op) else []
    b = open(np, encoding='utf-8').read().splitlines(keepends=True) if os.path.exists(np) else []
    if not a:
        patch_lines.append(f'--- /dev/null\n+++ b/{f}\n')
        patch_lines.extend('+' + l for l in b)
        continue
    d = list(difflib.unified_diff(a, b, fromfile=f'a/{f}', tofile=f'b/{f}'))
    patch_lines.extend(d)

with open(os.path.join(OUT, 'v0.4.0.patch'), 'w', encoding='utf-8') as fh:
    fh.writelines(patch_lines)
print('patch written:', sum(1 for l in patch_lines if l.startswith('+')), '+ lines,',
      sum(1 for l in patch_lines if l.startswith('-')), '- lines')

# copy full new tree
import shutil
for f in files + ['cognee-memory-add.cjs', 'skills/cognee-memory/SKILL.md']:
    src = os.path.join(NEW, f)
    dst = os.path.join(OUT, f)
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    if os.path.exists(src):
        shutil.copy2(src, dst)
print('tree copied to', OUT)
for root, dirs, fs2 in os.walk(OUT):
    for x in fs2:
        print('  ', os.path.join(root, x).replace(OUT, ''), os.path.getsize(os.path.join(root, x)), 'bytes')
