# SkillTree

Sandbox để thử nghiệm, benchmark và tự động hóa agent pipeline, phát triển skill/plugin
tích hợp vào các agent harness (OpenCode, DeepSeek Harness) trước khi đưa vào thực tế.

## Language

### Agent stack

**Agent**:
A model running inside a harness, executing skills and tools to complete work.
_Avoid_: bot, assistant, AI

**Harness**:
The runtime that connects a model to tools, sessions and skills so it can act as an
agent (e.g. OpenCode, DeepSeek Harness). Model + Harness = Agent.
_Avoid_: framework, runtime, wrapper

**Skill**:
A portable instruction module packaged as a SKILL.md directory that an agent loads
on demand. Skills move between harnesses unchanged.
_Avoid_: capability, prompt, tool

**Plugin**:
Code installed into a harness that extends its behavior (hooks, tools, adapters).
A plugin runs inside the harness; a skill is text loaded into the agent's context.
_Avoid_: extension, addon, integration

### Memory & measurement

**Memory**:
The persistent knowledge store (graph + vector) built by cognee from ingested data.
_Avoid_: knowledge base, RAG, cache

**Dataset**:
A named partition of Memory owned by cognee. Reserved: benchmark inputs must not
be called datasets.
_Avoid_: corpus, collection, index

**Corpus**:
A fixed, versioned collection of documents used as benchmark input.
_Avoid_: dataset, test set, data

**Pipeline**:
An automated data flow through cognee (ingest → cognify → index).
_Avoid_: workflow, process, job

**Benchmark**:
A repeatable measurement of memory quality or latency over a fixed Corpus and
question set.
_Avoid_: test, eval, experiment

**Run**:
One execution of a Benchmark configuration, producing results comparable to
other runs.
_Avoid_: trial, attempt, session

**Workstream**:
A tracked line of work in the issue tracker (e.g. benchmark harness, plugin
development).
_Avoid_: project, epic, feature
