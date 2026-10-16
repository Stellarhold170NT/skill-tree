# Local-first embedding stack: fastembed behind an OpenAI-compatible LLM gateway

The memory engine (cognee) needs both an LLM and an embedding provider. We run the LLM
on a free OpenAI-compatible gateway (Viettel NetMind, GLM-5.3-Flash) whose `/embeddings`
endpoint hangs — verified by direct request. Under a zero-budget, local-first constraint
we decided: LLM calls go to the gateway (`LLM_PROVIDER=openai` + custom `LLM_ENDPOINT`),
embeddings run locally via fastembed (`paraphrase-multilingual-MiniLM-L12-v2`), and all
storage stays local (SQLite + LanceDB + Ladybug).

## Considered options

- Gateway embeddings — unsupported, requests time out.
- `intfloat/multilingual-e5-large` — better retrieval quality, but ~2GB download and
  requires `query:`/`passage:` prefixes; MiniLM multilingual needs none.

## Consequences

- Embedding dimensionality (384) is baked into the vector store: switching the embedding
  model later requires `forget(memory_only=True)` and full re-ingestion.
- Chunk size is capped at the model's ~126-token input instead of cognee's 4096 default.
