# Ping

Sound notifications and alerts for Claude Code tasks.

## Overview

Ping provides audio feedback for key Claude Code events through hook-based sound notifications. Get notified when tasks complete, when Claude needs your input, or when sessions start/end.

See [CHANGELOG.md](CHANGELOG.md) for version history.

## Features

- **Session Start** - Sound notification when a Claude Code session begins
- **User Prompt** - Audio alert when Claude needs your input
- **Notification** - Sound for general notifications
- **Stop** - Sound when a session completes

## Installation

The Ping plugin is part of the VibeKit marketplace. Install via:

```bash
claude plugin install https://github.com/shrwnsan/vibekit-claude-plugins
```

### Quick Start with Warcraft Sounds

After installation, copy the included Warcraft sounds to the plugin's cache directory:

```bash
# Find your installed ping version (e.g., 1.2.0)
PING_VERSION=$(ls ~/.claude/plugins/cache/vibekit/ping/ | tail -1)

# Copy sounds to cache
cp ~/.claude/plugins/cache/vibekit/ping/$PING_VERSION/sounds/Peon*.wav \
   ~/.claude/plugins/cache/vibekit/ping/$PING_VERSION/sounds/
```

Then add to your `~/.claude/settings.json`:

```json
{
  "env": {
    "PING_ENABLED": "true",
    "PING_SOUND_SESSION_START": "PeonReady1.wav",
    "PING_SOUND_USER_PROMPT": "PeonYes4.wav",
    "PING_SOUND_NOTIFICATION": "PeonWhat3.wav",
    "PING_SOUND_STOP": "PeonBuildingComplete1.wav"
  }
}
```

Restart Claude Code and the sounds will play on session events.

## Configuration

Override individual sounds with environment variables in `~/.claude/settings.json` (relative paths are resolved against the plugin's `sounds/` directory, or use absolute paths):

```json
{
  "env": {
    "PING_ENABLED": "true",
    "PING_SOUND_SESSION_START": "PeonReady1.wav",
    "PING_SOUND_USER_PROMPT": "PeonYes4.wav",
    "PING_SOUND_NOTIFICATION": "PeonWhat3.wav",
    "PING_SOUND_STOP": "PeonBuildingComplete1.wav"
  }
}
```

To disable a specific event, set it to an empty string:

```json
{
  "env": {
    "PING_SOUND_USER_PROMPT": ""
  }
}
```

**Available settings:**
- `PING_ENABLED` - Enable/disable all sounds (default: `true`)
- `PING_SOUNDS_DIR` - Override default sound directory
- `PING_SOUND_SESSION_START` - Sound for session start event (set to `""` to disable)
- `PING_SOUND_USER_PROMPT` - Sound when Claude needs your input (set to `""` to disable)
- `PING_SOUND_NOTIFICATION` - Sound for general notifications (set to `""` to disable)
- `PING_SOUND_STOP` - Sound when session completes (set to `""` to disable)

**Note:** `${CLAUDE_PLUGIN_ROOT}` resolves to the plugin's cache directory (e.g., `~/.claude/plugins/cache/vibekit/ping/1.2.0/`) when hooks execute. Custom sound files should be placed in the installed plugin's `sounds/` directory within that cache path. The cache persists across Claude Code restarts and is not automatically cleared.

### Custom Sounds

Place custom sound files in the plugin's installed `sounds/` directory:

```bash
# Example: Copy sounds to the cache directory after installation
cp my-sound.wav ~/.claude/plugins/cache/vibekit/ping/1.2.0/sounds/session-start.wav
```

Or use environment variables to reference any sound files by absolute path.

**Default sound filenames** (used if no environment variables are set):

Place custom sound files in `sounds/`:

- `session-start.wav` - Session start notification
- `user-prompt.wav` - User prompt notification
- `notification.wav` - General notification
- `stop.wav` - Session complete notification

Supported formats: `.wav`, `.aiff` (AIFF/AIFC on macOS and Linux), `.mp3` and `.m4a` (macOS only with afplay)

### Using Game Sounds

Follow Delba's tip and use nostalgic game sounds! Here are some popular sources:

**Warcraft Sounds:**
- [WoWhead: Peon sounds](https://www.wowhead.com/sounds/name:peon)
- [WoWhead: Peasant sounds](https://www.wowhead.com/sounds/name:peasant)

**MyInstants (instant sound buttons):**
- [MyInstants: Mario sounds](https://www.myinstants.com/en/search/?name=mario)
- [MyInstants: SpongeBob sounds](https://www.myinstants.com/en/search/?name=spongebob)
- [MyInstants: Star Wars sounds](https://www.myinstants.com/en/search/?name=star+wars)

Place downloaded sounds in your `sounds/` directory and reference them in your `settings.json` (see Configuration above).

## Platform Support

- **macOS**: Uses `afplay` command
- **Linux**: Uses `paplay` (PulseAudio) or `aplay` (ALSA)
- **Windows**: Uses PowerShell `Media.SoundPlayer`

## License

Apache 2.0

## Acknowledgments

Inspired by [Delba Oliveira](https://x.com/delba_oliveira/status/2020515010985005255)'s tip on using game sounds for Claude Code notifications.
