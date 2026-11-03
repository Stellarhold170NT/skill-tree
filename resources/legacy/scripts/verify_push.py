"""Verify the pushed commit: file list + spot-check raw contents on main."""
import json
import urllib.request

TOKEN = os.environ.get("OPENMEM_TOKEN") if (os := __import__("os")).environ.get("OPENMEM_TOKEN") else None
HEADERS = {"Accept": "application/vnd.github+json", "User-Agent": "openmemory-verify"}
if TOKEN:
    HEADERS["Authorization"] = f"Bearer {TOKEN}"

COMMIT = "b4a19e2a38bc87ea128e3ac7be60dee6f9e8c130"


def get(url):
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req) as r:
        return r.read()


# 1. commit file list
data = json.loads(get(f"https://api.github.com/repos/Stellarhold170NT/openmemory/commits/{COMMIT}"))
print("commit:", data["sha"][:10], "|", data["commit"]["message"].split(chr(10))[0])
print("files:")
for f in data["files"]:
    print(f"   {f['status']:9} {f['filename']:42} +{f['additions']}/-{f['deletions']}")

# 2. raw spot-checks
raw = get("https://raw.githubusercontent.com/Stellarhold170NT/openmemory/main/package.json").decode()
print("\npackage.json on main:", json.loads(raw)["version"], "| optDeps:", json.loads(raw).get("optionalDependencies"))
raw = get("https://raw.githubusercontent.com/Stellarhold170NT/openmemory/main/graph.cjs").decode()
print("graph.cjs on main:", len(raw), "bytes | has openGraph:", "openGraph" in raw)
raw = get("https://raw.githubusercontent.com/Stellarhold170NT/openmemory/main/cognee-recall.cjs").decode()
print("cognee-recall.cjs on main:", len(raw), "bytes | has modes:", "RECALL MODES" in raw, "| has interleave:", "SAU 2 hit fused" in raw)
raw = get("https://raw.githubusercontent.com/Stellarhold170NT/openmemory/main/index.ts").decode()
print("index.ts on main:", len(raw), "bytes | in-process:", "@ladybugdb/core" in raw and "graph-server" not in raw)
try:
    get("https://raw.githubusercontent.com/Stellarhold170NT/openmemory/main/graph-server.py")
    print("graph-server.py on main: STILL EXISTS (BUG!)")
except Exception:
    print("graph-server.py on main: DELETED OK")
