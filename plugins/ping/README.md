# Ping

Sound notifications and alerts for Claude Code tasks.

## Overview

Ping provides audio feedback for key Claude Code events through hook-based sound notifications. Get notified when tasks complete, when Claude needs your input, or when sessions start/end.

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

## Configuration

### Environment Variables

Enable/disable sounds:

```bash
export PING_ENABLED=true  # Default: true
```

Override sound directory:

```bash
export PING_SOUNDS_DIR=/path/to/your/sounds
```

Override per-event sounds:

```bash
export PING_SOUND_SESSION_START=/path/to/start.wav
export PING_SOUND_USER_PROMPT=/path/to/prompt.wav
export PING_SOUND_NOTIFICATION=/path/to/notification.wav
export PING_SOUND_STOP=/path/to/stop.wav
```

### Custom Sounds

Place custom sound files in `hooks/sounds/`:

- `session-start.wav` - Session start notification
- `user-prompt.wav` - User prompt notification
- `notification.wav` - General notification
- `stop.wav` - Session complete notification

Supported formats: `.wav`, `.aiff`, `.mp3`, `.m4a` (depending on platform)

### Using Game Sounds

Follow Delba's tip and use nostalgic game sounds! Download sounds from:
- Starcraft
- Warcraft
- Mario
- Any other game you love

Place them in your sounds directory and configure via environment variables.

## Platform Support

- **macOS**: Uses `afplay` command
- **Linux**: Uses `paplay` (PulseAudio) or `aplay` (ALSA)
- **Windows**: Uses PowerShell `Media.SoundPlayer`

## License

Apache 2.0
