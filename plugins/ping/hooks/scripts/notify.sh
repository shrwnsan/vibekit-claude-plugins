#!/usr/bin/env bash

# Ping - Sound notification hook for Claude Code
# Plays sounds on various Claude Code events

set -euo pipefail

# Allow disabling via environment variable
if [[ "${PING_ENABLED:-true}" =~ ^(false|0|no|off)$ ]]; then
  exit 0
fi

# Sound directory - uses PING_SOUNDS_DIR env var or defaults to plugin's sounds directory
SOUNDS_DIR="${PING_SOUNDS_DIR:-${CLAUDE_PLUGIN_ROOT}/hooks/sounds}"

# Map event types to sound files
# Environment variables can override per-event sounds
case "${1}" in
  session-start)
    SOUND="${PING_SOUND_SESSION_START:-${SOUNDS_DIR}/session-start.wav}"
    ;;
  user-prompt)
    SOUND="${PING_SOUND_USER_PROMPT:-${SOUNDS_DIR}/user-prompt.wav}"
    ;;
  notification)
    SOUND="${PING_SOUND_NOTIFICATION:-${SOUNDS_DIR}/notification.wav}"
    ;;
  stop)
    SOUND="${PING_SOUND_STOP:-${SOUNDS_DIR}/stop.wav}"
    ;;
  *)
    exit 0
    ;;
esac

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
      timeout 5 afplay "$SOUND" 2>/dev/null || true
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
      powershell -c "(New-Object Media.SoundPlayer '$SOUND').PlaySync()" 2>/dev/null || true
    fi
    ;;
esac

exit 0
