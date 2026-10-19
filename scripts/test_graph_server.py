"""Test openmemory v0.3.0 graph-server.py against the REAL SWEBOK .lbug graph.

Launches the sidecar, reads PORT, then POSTs /schema + 1-hop + 2-hop Cypher.
Measures latency per call. This simulates exactly what the plugin's cognee_graph tool does.
"""
import json
import time
import os
import signal
import subprocess
import urllib.request

LBUG = "/workspace/.cognee_system/databases/319c34d8-55c2-4aba-894b-030aafdbb49d/b15b5f24-eb51-5655-b773-07c21aa4adb9.lbug"


def main():
    p = subprocess.Popen(
        ["/opt/venv/bin/python", "scripts/graph-server.py", LBUG],
        stdout=open("/tmp/graphsrv.log", "w"),
        stderr=subprocess.STDOUT,
        cwd="/workspace",
        start_new_session=True,
    )
    port = None
    t0 = time.time()
    while time.time() - t0 < 45:
        try:
            for line in open("/tmp/graphsrv.log"):
                if line.startswith("PORT "):
                    port = int(line.split()[1])
                    break
        except FileNotFoundError:
            pass
        if port:
            break
        time.sleep(0.5)
    if not port:
        print("NO PORT — server failed:")
        print(open("/tmp/graphsrv.log").read()[:800])
        return

    time.sleep(1.0)
    for line in open("/tmp/graphsrv.log"):
        print("LOG:", line.strip()[:120])

    def post(path, payload):
        t = time.time()
        req = urllib.request.Request(
            "http://127.0.0.1:%d%s" % (port, path),
            data=json.dumps(payload).encode(),
            headers={"Content-Type": "application/json"},
        )
        r = json.load(urllib.request.urlopen(req, timeout=25))
        return round((time.time() - t) * 1000), r

    ms, sch = post("/schema", {})
    print("schema %dms tables:" % ms, [row[2] for row in sch["rows"]])

    cy1 = "MATCH (a:Node)-[r]->(b:Node) WHERE a.name CONTAINS $t RETURN a.name, r.relationship_name, b.name LIMIT 5"
    ms, res = post("/query", {"cypher": cy1, "params": {"t": "quality"}})
    print("1-hop %dms:" % ms)
    for row in res["rows"][:5]:
        print("   ", row)

    cy2 = "MATCH (a:Node)-[r1]->(m:Node)-[r2]->(c:Node) WHERE a.name CONTAINS $t RETURN a.name, r1.relationship_name, m.name, r2.relationship_name, c.name LIMIT 5"
    ms, res2 = post("/query", {"cypher": cy2, "params": {"t": "quality"}})
    print("2-hop %dms:" % ms)
    for row in res2["rows"][:5]:
        print("   ", row)

    cy3 = "MATCH (a:Node)-[r]->(b:Node) WHERE a.name CONTAINS $t RETURN count(*)"
    ms, res3 = post("/query", {"cypher": cy3, "params": {"t": "quality"}})
    print("edge-count from 'quality' %dms:" % ms, res3["rows"])

    try:
        os.killpg(os.getpgid(p.pid), signal.SIGTERM)
    except Exception:
        p.kill()
    print("server stopped")


if __name__ == "__main__":
    main()
