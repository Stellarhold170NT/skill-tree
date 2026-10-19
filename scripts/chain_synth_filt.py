"""Chain: đợi 'synth+judge ALL DONE' (deep with-QA) trong PLUGIN-synth.log rồi chạy synth cho deep-noqa-filt."""
import subprocess
import time
from pathlib import Path

LOGF = Path("/workspace/runs/t7/PLUGIN-synth.log")
while True:
    try:
        txt = LOGF.read_text(encoding="utf-8")
        if txt.count("ALL DONE") >= 2:  # deep-noqa done, deep with-QA done
            break
    except FileNotFoundError:
        pass
    time.sleep(45)
time.sleep(5)
subprocess.run(["/opt/venv/bin/python", "/workspace/scripts/synth_judge_plugin.py", "deep-noqa-filt"])
