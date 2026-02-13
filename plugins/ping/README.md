# Ping

Sound notifications and alerts for Claude Code tasks.

## Overview

Ping provides audio feedback for key Claude Code events through hook-based sound notifications. Get notified when tasks complete, when Claude needs your input, or when sessions start/end.


## Features

- **Session Start** - Sound notification when a Claude Code session begins
- **User Prompt** - Audio alert when Claude needs your input
- **Notification** - Sound for general notifications
- **Stop** - Sound when a session completes

## Quick Start / Installation

The Ping plugin is part of the VibeKit marketplace.

1. Install via:

```bash
claude plugin marketplace add shrwnsan/vibekit-claude-plugins

claude plugin install ping@vibekit
```

2. Restart Claude Code

3. Sounds will play on session events

That's it! The plugin uses built-in OS sounds by default.

## Configuration (Recommended)

Create a configuration file at `~/.claude/ping-config.json`:

```json
{
  "$schema": "https://raw.githubusercontent.com/shrwnsan/vibekit-claude-plugins/main/plugins/ping/config-schema.json",
  "soundsDir": "~/custom-sounds",
  "sounds": {
    "sessionStart": "PeonReady1.wav",
    "userPrompt": "PeonYes3.wav",
    "notification": "PeonWhat3.wav",
    "stop": "PeonBuildingComplete1.wav"
  }
}
```

This approach:
- Helps custom sound directory (soundsDir) work with hook events (unlike `PING_SOUNDS_DIR` environment variable)
- Survives plugin updates without reconfiguration
- Supports IDE autocomplete via [JSON Schema](config-schema.json)

See [ping-config.json.example](ping-config.json.example) for a full template with all options.

## Custom Sounds

**Default sound filenames** (used if no config or environment variables are set):

- `session-start.wav` - Session start notification
- `user-prompt.wav` - User prompt notification
- `notification.wav` - General notification
- `stop.wav` - Session complete notification

**Supported formats:** `.wav`, `.aiff` (AIFF/AIFC on macOS and Linux), `.mp3` and `.m4a` (macOS only with afplay)

### Using Game Sounds

Follow Delba's tip and use nostalgic game sounds! Here are some popular sources:

**Warcraft Sounds:**
- [WoWhead: Peon sounds](https://www.wowhead.com/sounds/name:peon)
- [WoWhead: Peasant sounds](https://www.wowhead.com/sounds/name:peasant)

**MyInstants (instant sound buttons):**
- [MyInstants: Mario sounds](https://www.myinstants.com/en/search/?name=mario)
- [MyInstants: SpongeBob sounds](https://www.myinstants.com/en/search/?name=spongebob)
- [MyInstants: Star Wars sounds](https://www.myinstants.com/en/search/?name=star+wars)

## Platform Support

- **macOS**: Uses `afplay` command
- **Linux**: Uses `paplay` (PulseAudio) or `aplay` (ALSA)
- **Windows**: Uses PowerShell `Media.SoundPlayer`

## 📈 Recent Updates

- **v1.3.0**: Added config file support (`~/.claude/ping-config.json`) that works with hook events, with JSON schema for IDE autocomplete
- **v1.2.0**: Added relative sound filenames, per-event disable, and `${CLAUDE_PLUGIN_ROOT}` variable; migrated to `settings.json` configuration
- **v1.0.0**: Initial release with sound notifications for session events

See [CHANGELOG.md](CHANGELOG.md) for version history.

## License

Apache 2.0

## Acknowledgments

Inspired by [Delba Oliveira](https://x.com/delba_oliveira/status/2020515010985005255)'s tip on using game sounds for Claude Code notifications.
