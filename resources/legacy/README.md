# resources/legacy - Pre-V1 benchmark archive (NOT active code)

This directory preserves the legacy artifacts of the earlier SkillTree
benchmark phase (the Spark/x26 era: SWE-bok corpus ingestion, openmemory
v0.40 experiments, stage A-C evaluation harnesses). Per the repo hygiene
policy in AGENTS.md section 4, these artifacts are **kept but quarantined**:
moved out of the top-level tree so they cannot be mistaken for the current
architecture, while remaining available for historical reference.

**This is NOT active code.** The current platform lives in `services/`
(M1-M11), `deploy/` and `plugins/`. Nothing in this directory is built,
run, tested or maintained. Do not import from it, and do not edit its
contents (history stays intact - use `git log` to trace where each subtree
came from).

## Contents

- `corpora/` - origin: `corpora/` - legacy benchmark input corpus (swebok-v4)
- `openmemory-v040/` - origin: `openmemory-v040/` - old memory experiment for
  OpenCode (cognee recall / graph probes)
- `src-skilltree-bench/` - origin: `src/` - old benchmark codebase
  (`src/skilltree` ingestion + eval harness)
- `tests/` - origin: `tests/test_stage_c.py` - old benchmark suite for the
  stage-C pipeline
- `scripts/` - origin: `scripts/` - 43 one-off bench/chain/judge/patch/probe
  scripts of the benchmark era
- `reports/` - origin: `reports/` - old benchmark reports and JSON evidence
  (bank_probe, benchmark-final, lightrag-smoke, task-1..7)

## Notes for anyone reviving these artifacts

- `configs/presets/*.yaml` still reference `corpora/swebok-v4/...`; the new
  location is `resources/legacy/corpora/swebok-v4/swebok-v4.md`. Those presets
  themselves belong to the retired benchmark pipeline.
- `services/skill-tree-service/sdk` mentions `reports/task-N-report.md` as a
  convention for agent workspace reports - unrelated to the archived
  `reports/` files here.
