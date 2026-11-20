# tempo-gate arm image: claude CLI + agent-browser + chromium + python3.
# Debian base because the agent-browser binary is a glibc ELF (built for aarch64).
FROM node:22-bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
      chromium python3 ca-certificates curl bash && \
    rm -rf /var/lib/apt/lists/* && \
    npm install -g @anthropic-ai/claude-code

# agent-browser binary is provided at build time (see build.sh)
COPY agent-browser /usr/local/bin/agent-browser
ENV AGENT_BROWSER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /run
CMD ["bash", "/run/harness.sh"]
