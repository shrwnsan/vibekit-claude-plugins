# Ping Sounds

Place your custom sound files in this directory.

## Expected Files

- `session-start.wav` - Sound played when a Claude Code session starts
- `user-prompt.wav` - Sound played when Claude needs your input
- `notification.wav` - Sound played for general notifications
- `stop.wav` - Sound played when a session completes

## Default Fallback

If no custom sounds are provided, Ping falls back to the system "Glass" sound on macOS (`/System/Library/Sounds/Glass.aiff`). On Linux and Windows, no system sound fallback is available — sounds will only play if custom sound files are provided.

## Game Sounds

Add nostalgic game sounds here! Some classic sources:
- Starcraft unit sounds
- Warcraft acknowledgements
- Mario power-up sounds
- Any game sounds you love

## Audio Conversion (macOS)

If you have OGG or other audio formats that need conversion to WAV, macOS has a built-in tool:

```bash
afconvert -f WAVE -d LEI16 input.ogg output.wav
```

To convert all OGG files in the current directory:

```bash
for f in *.ogg; do afconvert -f WAVE -d LEI16 "$f" "${f%.ogg}.wav"; done
```
