FROM node:22-bookworm-slim

# Sandbox + network isolation + diagnostics tooling
RUN apt-get update && apt-get install -y --no-install-recommends \
    bubblewrap \
    socat \
    iptables \
    ca-certificates \
    curl \
    git \
    python3 \
    procps \
    && rm -rf /var/lib/apt/lists/*

# FROZEN CORE — the only pieces baked into the image:
#   dsh        : DeepSeek Harness (runtime + web UI)
#   dsh-plugin : CLI tool for `dsh plugin add` inside the sandbox (npm package,
#                khác với plugins/dsh-plugin cũ đã bỏ - Plugin Hub/Gitea bridge)
#   pnpm       : used by `dsh plugin add` inside the sandbox
# Everything else is DATA, not image:
#   - plugins/ (patch.yml, secret, skilltree, skilltree-brand) → bind mount :ro
#   - business plugins → push to Gitea, then Install/Uninstall from the Web UI
#     (persisted in workspace/.dsh/profiles/web, survives rebuilds)
#
# NOTE (skill-tree-service): bản gốc agent-harness-server còn bake steel-mcp
# (Steel Browser MCP) + officecli (OfficeCLI binary) — không phục vụ đồ án
# SkillTree nên đã bỏ. Thêm lại khi cần: xem docs/deployment.md §4.3, §4.5b
# trong repo gốc <internal-agent-harness-repo>.
RUN npm install -g @deepseek-ai/dsh@0.1.5-rc.3 dsh-plugin pnpm

# SkillTree shadow: dsh-client-connection đã vá (isLoopbackHostname tin thêm các
# authority của deployment để Settings UI mở được từ host ngoài localhost).
# Re-extract the pristine package from the image after any @deepseek-ai/dsh
# version bump, re-apply the one-function patch, and rebuild.
COPY plugins/dsh-client-connection /usr/local/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-client-connection

# Prepare writable dirs for user 'node' (uid 1000)
WORKDIR /app
RUN mkdir -p /app/data /app/workspace /app/plugins \
    && chown -R node:node /app

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 3080

ENTRYPOINT ["/entrypoint.sh"]
