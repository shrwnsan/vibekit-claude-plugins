#!/usr/bin/env bash
# In-container harness: run claude against /run/prompt.txt with skills from /run/config.
set -u
export CLAUDE_CONFIG_DIR=/run/config
cd /run/page
claude -p "$(cat /run/prompt.txt)" \
  --output-format json \
  --max-turns "${TEMPO_GATE_MAX_TURNS:-40}" \
  ${TEMPO_GATE_MODEL:+--model "$TEMPO_GATE_MODEL"} \
  --dangerously-skip-permissions
