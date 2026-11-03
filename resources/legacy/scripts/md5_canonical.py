"""Compare /tmp/openmemory-main vs /workspace/openmemory-v040 vs locally-present check."""
import hashlib

paths = [
    ("index.ts", "/tmp/openmemory-main/index.ts"),
    ("package.json", "/tmp/openmemory-main/package.json"),
    ("README.md", "/tmp/openmemory-main/README.md"),
    ("cognee-recall.cjs", "/tmp/openmemory-main/cognee-recall.cjs"),
    ("graph.cjs", "/tmp/openmemory-main/graph.cjs"),
    ("skills/cognee-memory/SKILL.md", "/tmp/openmemory-main/skills/cognee-memory/SKILL.md"),
    ("cognee-memory-add.cjs", "/tmp/openmemory-main/cognee-memory-add.cjs"),
]
for _, p in paths:
    try:
        data = open(p, "rb").read()
        print(hashlib.md5(data).hexdigest(), p, len(data))
    except FileNotFoundError:
        print("MISSING", p)
