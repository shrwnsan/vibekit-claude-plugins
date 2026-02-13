#!/usr/bin/env bash

# Ping - Sound notification hook for Claude Code
# Plays sounds on various Claude Code events

set -euo pipefail

# Config file locations to search (in order)
CONFIG_FILES=(
  "$HOME/.claude/ping-config.json"
  "$CLAUDE_PLUGIN_ROOT/ping-config.json"
)

# Read config file if it exists (uses python3 for robust JSON parsing)
CFG_ENABLED=""
CFG_SOUNDS_DIR=""
CFG_SESSION_START=""
CFG_USER_PROMPT=""
CFG_NOTIFICATION=""
CFG_STOP=""

for config_file in "${CONFIG_FILES[@]}"; do
  if [[ -f "$config_file" ]]; then
    eval "$(python3 -c "
import json, sys
try:
    with open('$config_file') as f:
        cfg = json.load(f)
    print(f'CFG_ENABLED={str(cfg.get(\"enabled\", True)).lower()}')
    sounds_dir = cfg.get('soundsDir', '')
    print(f'CFG_SOUNDS_DIR={sounds_dir}')
    sounds = cfg.get('sounds', {})
    for key, var in [('sessionStart','CFG_SESSION_START'),('userPrompt','CFG_USER_PROMPT'),('notification','CFG_NOTIFICATION'),('stop','CFG_STOP')]:
        print(f'{var}={sounds.get(key, \"\")}')
except Exception as e:
    pass  # Silent fallback on parse errors
" 2>/dev/null)" || true

    break
  fi
done

# Allow disabling via config file or environment variable
# Config takes precedence, env var as fallback
if [[ "${CFG_ENABLED:-true}" == "false" ]] || [[ "${PING_ENABLED:-true}" =~ ^(false|0|no|off)$ ]]; then
  exit 0
fi

# Sound directory - config file, then env var, then default
SOUNDS_DIR="${CFG_SOUNDS_DIR:-${PING_SOUNDS_DIR:-${CLAUDE_PLUGIN_ROOT}/sounds}}"

# Map event types to sound files
# Config file values can override defaults, env vars override both
# Set to empty string to disable a specific event
case "${1:-}" in
  session-start)
    SOUND="${PING_SOUND_SESSION_START:-${CFG_SESSION_START:-session-start.wav}}"
    ;;
  user-prompt)
    SOUND="${PING_SOUND_USER_PROMPT:-${CFG_USER_PROMPT:-user-prompt.wav}}"
    ;;
  notification)
    SOUND="${PING_SOUND_NOTIFICATION:-${CFG_NOTIFICATION:-notification.wav}}"
    ;;
  stop)
    SOUND="${PING_SOUND_STOP:-${CFG_STOP:-stop.wav}}"
    ;;
  *)
    exit 0
    ;;
esac

# Empty value explicitly disables sound for this event
if [[ -z "$SOUND" ]]; then
  exit 0
fi

# Resolve relative filenames against SOUNDS_DIR
if [[ "$SOUND" != /* ]]; then
  SOUND="${SOUNDS_DIR}/${SOUND}"
fi

# Fallback to system sound if custom file doesn't exist
if [[ ! -f "$SOUND" ]]; then
  case "$OSTYPE" in
    darwin*)
      SOUND="/System/Library/Sounds/Glass.aiff"
      ;;
    *)
      # No system sound fallback for non-macOS, will gracefully exit below
      SOUND=""
      ;;
  esac
fi

# Play sound based on platform
case "$OSTYPE" in
  darwin*)
    if command -v afplay &>/dev/null && [[ -f "$SOUND" ]]; then
      if command -v timeout &>/dev/null; then
        timeout 5 afplay "$SOUND" 2>/dev/null || true
      else
        afplay "$SOUND" 2>/dev/null &
        AFPLAY_PID=$!
        ( sleep 5 && kill "$AFPLAY_PID" 2>/dev/null ) &
        wait "$AFPLAY_PID" 2>/dev/null || true
      fi
    fi
    ;;
  linux*)
    if command -v paplay &>/dev/null && [[ -f "$SOUND" ]]; then
      paplay "$SOUND" 2>/dev/null || true
    elif command -v aplay &>/dev/null && [[ -f "$SOUND" ]]; then
      aplay -q "$SOUND" 2>/dev/null || true
    fi
    ;;
  msys*|cygwin*|win*)
    if command -v powershell &>/dev/null && [[ -f "$SOUND" ]]; then
      powershell -c "(New-Object Media.SoundPlayer \"$SOUND\").PlaySync()" 2>/dev/null || true
    fi
    ;;
esac

exit 0
