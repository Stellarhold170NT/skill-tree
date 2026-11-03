"""Push openmemory v0.4.0 to GitHub main via REST API (no git needed).

Strategy: /tmp/openmemory-main is the canonically-tested tree (md5-recorded).
Steps: blobs -> tree(base_tree + delete graph-server.py) -> commit -> update main ref.
Token via env OPENMEM_TOKEN.
"""
import base64
import json
import os
import sys
import urllib.request
import urllib.error

TOKEN = os.environ.get("OPENMEM_TOKEN")
if not TOKEN:
    print("missing OPENMEM_TOKEN env"); sys.exit(1)

OWNER = "Stellarhold170NT"
REPO = "openmemory"
SRC = "/tmp/openmemory-main"
API = f"https://api.github.com/repos/{OWNER}/{REPO}"

UPDATES = {
    "index.ts": f"{SRC}/index.ts",
    "cognee-recall.cjs": f"{SRC}/cognee-recall.cjs",
    "graph.cjs": f"{SRC}/graph.cjs",
    "package.json": f"{SRC}/package.json",
    "README.md": f"{SRC}/README.md",
    "skills/cognee-memory/SKILL.md": f"{SRC}/skills/cognee-memory/SKILL.md",
}
DELETES = ["graph-server.py"]

MSG = "v0.4.0: all-JS in-process graph (@ladybugdb/core@0.19.0), 4 recall modes" \
    + "\n\n- graph.cjs (new): read *.lbug read-only via @ladybugdb/core — no Python, no sidecar, no HTTP." \
    + "\n- cognee-recall.cjs: recall modes (semantic/lexical/hybrid/deep); deep = hybrid + real graph traversal" \
    + "\n- index.ts: graph layer rewritten to use in-process engine; cognee_graph gains memory param" \
    + "\n- package.json: optionalDependencies @ladybugdb/core@0.19.0 (per-platform binary auto-selected)" \
    + "\n- remove graph-server.py (superseded by graph.cjs)" \
    + "\n\nVerified against the real SWEBOK db: 11,277 nodes / 48,382 edges exact-match;" \
    + " 1-hop 137ms / 2-hop 119ms / param query 31ms; all 4 modes behaviour-checked."


def gh(path, method="GET", body=None):
    req = urllib.request.Request(
        f"{API}/{path}",
        data=json.dumps(body).encode() if body is not None else None,
        method=method,
        headers={
            "Authorization": f"Bearer {TOKEN}",
            "Accept": "application/vnd.github+json",
            "Content-Type": "application/json",
            "User-Agent": "openmemory-contrib",
        },
    )
    try:
        with urllib.request.urlopen(req) as r:
            return json.load(r)
    except urllib.error.HTTPError as e:
        print(f"HTTP {e.code} on {method} /{path}: {e.read().decode()[:400]}")
        sys.exit(1)


# 1. HEAD của main
ref = gh("git/ref/heads/main")
head_sha = ref["object"]["sha"]
print(f"1. HEAD main: {head_sha}")

# 2. tree của HEAD
commit = gh(f"git/commits/{head_sha}")
base_tree = commit["tree"]["sha"]
print(f"2. base tree: {base_tree}")

# 3. blobs cho các file update
tree_entries = []
for path, fpath in UPDATES.items():
    raw = open(fpath, "rb").read()
    blob = gh("git/blobs", "POST", {
        "content": base64.b64encode(raw).decode(),
        "encoding": "base64",
    })
    print(f"3. blob {path}: {len(raw)} bytes -> {blob['sha'][:10]}")
    tree_entries.append({"path": path, "mode": "100644", "type": "blob", "sha": blob["sha"]})

# 4. deletes
for path in DELETES:
    tree_entries.append({"path": path, "mode": "100644", "type": "blob", "sha": None})
    print(f"4. queue delete: {path}")

# 5. tree mới
new_tree = gh("git/trees", "POST", {"base_tree": base_tree, "tree": tree_entries})
print(f"5. new tree: {new_tree['sha']}")

# 6. commit
new_commit = gh("git/commits", "POST", {
    "message": MSG,
    "tree": new_tree["sha"],
    "parents": [head_sha],
})
print(f"6. commit: {new_commit['sha']}")

# 7. move main ref (fail nếu main đã di chuyển — không force blind)
upd = gh("git/refs/heads/main", "PATCH", {"sha": new_commit["sha"], "force": False})
print(f"7. main -> {upd['object']['sha']}")
print("DONE")
