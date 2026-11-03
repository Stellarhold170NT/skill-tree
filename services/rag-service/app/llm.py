"""Optional ask-time LLM synthesis (NetMind-compatible gateway) — design §6.5.

Credentials come only from env; failure modes degrade to `llmError` reasons:
llm-not-configured | llm-unavailable | llm-timeout | llm-empty-after-retry.
"""

import httpx

from . import config

SYSTEM_PROMPT = (
    "You are a study assistant. Answer ONLY from the provided context snippets. "
    "Cite the section paths you used, e.g. [4 > Democracies > Electoral Systems]. "
    "If the context is insufficient, say so."
)


def configured() -> bool:
    return bool(config.LLM_ENDPOINT and config.LLM_MODEL and config.LLM_API_KEY)


def synthesize(question: str, contexts: list[dict]) -> tuple[str | None, str | None]:
    """One completion call with retry-on-empty. Returns (answer, llmError)."""
    if not configured():
        return None, "llm-not-configured"
    context_block = "\n\n".join(
        f"[{c['sectionPath']}]\n{c['snippet']}" for c in contexts
    )
    payload = {
        "model": config.LLM_MODEL,
        "temperature": 0,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {
                "role": "user",
                "content": (
                    f"Question: {question}\n\nContext:\n{context_block}\n\n"
                    "Answer with section-path citations."
                ),
            },
        ],
    }
    headers = {"Authorization": f"Bearer {config.LLM_API_KEY}"}
    for attempt in range(2):  # retry-on-empty: 1 retry (design §6.5)
        try:
            resp = httpx.post(
                f"{config.LLM_ENDPOINT}/chat/completions",
                json=payload,
                headers=headers,
                timeout=config.LLM_TIMEOUT_S,
            )
        except httpx.TimeoutException:
            return None, "llm-timeout"
        except httpx.HTTPError:
            return None, "llm-unavailable"
        if resp.status_code != 200:
            return None, f"llm-unavailable:{resp.status_code}"
        try:
            content = (resp.json()["choices"][0]["message"].get("content") or "").strip()
        except (KeyError, IndexError, ValueError):
            return None, "llm-unavailable"
        if content:
            return content, None
    return None, "llm-empty-after-retry"
