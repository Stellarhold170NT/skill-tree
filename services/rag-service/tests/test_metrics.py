"""/api/v1/metrics: counters + rolling p50/p95 for ask and ingest."""

import json

from tests.conftest import SAMPLE_MD


def test_metrics_records_ask_and_ingest(client, upload, wait_ready):
    body = upload("notes.md", SAMPLE_MD)
    job = wait_ready(body["jobId"])
    assert job["status"] == "ready"
    client.post("/api/v1/ask", json={"question": "plurality voting"})

    m = client.get("/api/v1/metrics").json()
    assert m["counters"]["askTotal"] >= 1
    assert m["counters"]["uploadTotal"] >= 1
    assert m["askRetrieveMs"]["count"] >= 1
    assert {"p50Ms", "p95Ms", "maxMs", "avgMs"} <= set(m["askRetrieveMs"])
    assert m["ingestMs"]["count"] >= 1
    print("METRICS_EVIDENCE " + json.dumps(m, ensure_ascii=False))
