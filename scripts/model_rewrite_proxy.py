"""Proxy ghi lại cục bộ: strip tiền tố "openai/" khỏi model trước khi forward gateway.

Bối cảnh (2026-10-18): policy team của gateway netmind.viettel.vn chỉ cho phép model
"zai-org/GLM-5.3-Flash" / "MiniMax/MiniMax-M3" (so khớp CHÍNH XÁC), trong khi litellm
cần tiền tố "openai/" để route đúng provider. Proxy này đứng giữa:

    litellm --(openai/zai-org/GLM-5.3-Flash)--> proxy:8771 --(zai-org/GLM-5.3-Flash)--> gateway

Chạy daemon:  /opt/venv/bin/python scripts/model_rewrite_proxy.py 8771 &
.env:         LLM_ENDPOINT=http://127.0.0.1:8771/gateway/v1
"""

import json
import sys
import urllib.request
import urllib.error
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

UPSTREAM = "https://netmind.viettel.vn"
HOP_HEADERS = {"content-length", "host", "connection", "accept-encoding"}


class Handler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def log_message(self, fmt, *args):  # im lặng — log của build đã đủ
        pass

    def _forward(self, method: str) -> None:
        length = int(self.headers.get("Content-Length") or 0)
        body = self.rfile.read(length) if length else None

        out_body = body
        if body and (method == "POST") and self.path.endswith("/chat/completions"):
            try:
                payload = json.loads(body)
                model = payload.get("model")
                if isinstance(model, str) and model.startswith("openai/"):
                    payload["model"] = model[len("openai/"):]
                    out_body = json.dumps(payload).encode()
            except Exception:
                pass  # body lạ → forward nguyên bản

        url = UPSTREAM + self.path
        req = urllib.request.Request(url, data=out_body, method=method)
        for k, v in self.headers.items():
            if k.lower() not in HOP_HEADERS:
                req.add_header(k, v)
        if out_body is not None:
            req.add_header("Content-Length", str(len(out_body)))

        try:
            resp = urllib.request.urlopen(req, timeout=600)
            status, data, hdrs = resp.status, resp.read(), resp.headers
        except urllib.error.HTTPError as e:
            status, data, hdrs = e.code, e.read(), e.headers
        except Exception as e:  # noqa: BLE001
            msg = json.dumps({"error": {"message": f"proxy upstream error: {e}"}}).encode()
            self.send_response(502)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(msg)))
            self.end_headers()
            self.wfile.write(msg)
            return

        self.send_response(status)
        for k, v in hdrs.items():
            if k.lower() not in HOP_HEADERS:
                self.send_header(k, v)
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_POST(self):  # noqa: N802
        self._forward("POST")

    def do_GET(self):  # noqa: N802
        self._forward("GET")


def main() -> int:
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8771
    ThreadingHTTPServer.allow_reuse_address = True
    server = ThreadingHTTPServer(("127.0.0.1", port), Handler)
    print(f"[model_rewrite_proxy] listening on 127.0.0.1:{port} -> {UPSTREAM}", flush=True)
    server.serve_forever()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
