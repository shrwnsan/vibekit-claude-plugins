# Ping Config File Pattern Evaluation

**Date**: 2026-02-13
**Status**: Draft
**Related Issue**: N/A

## Problem Statement

The `PING_SOUNDS_DIR` environment variable does not work when the ping plugin is invoked via hook events in Claude Code. This is because environment variables defined in `settings.json` are not passed to hook commands.

### Current Behavior

Users can set `PING_SOUNDS_DIR` in their Claude Code `settings.json`:

```json
{
  "env": {
    "PING_SOUNDS_DIR": "~/custom-sounds"
  }
}
```

However, this has no effect because hooks execute as separate shell processes that do not inherit environment variables from `settings.json`.

### Current Workarounds

The README currently documents two working approaches:

1. **Individual `PING_SOUND_*` variables** — Set each sound file explicitly
2. **Copy to cache directory** — Place files directly in the plugin's cache

Both approaches are cumbersome compared to a simple directory setting.

## Reference Implementation: claude-statusline

The `claude-statusline` plugin uses a config file pattern that could be adapted for ping.

### Key Characteristics

**Config file locations searched (in order):**
1. Current working directory (`cwd`)
2. Parent directory (`dirname(cwd)`)
3. `~/.claude/` (home config directory)

**Supported formats:**
- `claude-statusline.json`
- `claude-statusline.yaml`

**Loading logic:**
```typescript
// Search in current directory first, then parent directories, then ~/.claude/
const searchPaths = [cwd, dirname(cwd), join(homedir(), '.claude')];

for (const searchPath of searchPaths) {
  for (const filename of CONFIG_FILES) {
    const configPath = join(searchPath, filename);

    if (existsSync(configPath)) {
      // Parse JSON or YAML
    }
  }
}
```

**Example config:**
```json
{
  "$schema": "https://raw.githubusercontent.com/shrwnsan/claude-statusline/main/config-schema.json",
  "envContext": true,
  "truncate": true,
  "noEmoji": false,
  "symbols": {
    "git": "",
    "model": "󰚩"
  }
}
```

### Why This Works for Hooks

Unlike environment variables, **hook scripts can read files directly from the filesystem**. This is the key insight that makes the config file pattern viable for ping.

## Proposed Solution for Ping

### Config File Specification

**File name:** `ping-config.json`

**Search locations (in order of priority):**
1. `~/.claude/ping-config.json` (recommended global location)
2. `<plugin-root>/ping-config.json` (plugin-level fallback)

> **Note:** Unlike `claude-statusline` which searches `cwd` → parent → `~/.claude/`, ping skips directory-based search because sound configuration is inherently global (not project-specific). The home config is checked first since that's the recommended user-facing location.

**Schema:**
```json
{
  "$schema": "https://raw.githubusercontent.com/shrwnsan/vibekit-claude-plugins/main/plugins/ping/config-schema.json",
  "enabled": true,
  "soundsDir": "~/custom-sounds",
  "sounds": {
    "sessionStart": "PeonReady1.wav",
    "userPrompt": "PeonYes4.wav",
    "notification": "PeonWhat3.wav",
    "stop": "PeonBuildingComplete1.wav"
  }
}
```

Field descriptions belong in `config-schema.json` using JSON Schema's `description` property, not as `_*_note` fields in the config itself.

### Implementation Changes

#### 1. Modify `notify.sh` Hook Script

**Current code (line 13-14):**
```bash
# Sound directory - uses PING_SOUNDS_DIR env var or defaults to plugin's sounds directory
SOUNDS_DIR="${PING_SOUNDS_DIR:-${CLAUDE_PLUGIN_ROOT}/sounds}"
```

**Proposed change:**
```bash
# Config file locations to search (in order)
CONFIG_FILES=(
  "$HOME/.claude/ping-config.json"
  "$CLAUDE_PLUGIN_ROOT/ping-config.json"
)

# Read config file if it exists (uses python3 for robust JSON parsing)
PING_ENABLED=true
SOUNDS_DIR=""

for config_file in "${CONFIG_FILES[@]}"; do
  if [[ -f "$config_file" ]]; then
    eval "$(python3 -c "
import json, sys
with open('$config_file') as f:
    cfg = json.load(f)
print(f'PING_ENABLED={str(cfg.get(\"enabled\", True)).lower()}')
print(f'SOUNDS_DIR={cfg.get(\"soundsDir\", \"\")}')
sounds = cfg.get('sounds', {})
for key, var in [('sessionStart','SESSION_START'),('userPrompt','USER_PROMPT'),('notification','NOTIFICATION'),('stop','STOP')]:
    print(f'{var}={sounds.get(key, \"\")}')
" 2>/dev/null)" || true

    break
  fi
done

# Allow disabling via config file or environment variable
if [[ "$PING_ENABLED" =~ ^(false|0|no|off)$ ]] || [[ "${PING_ENABLED:-true}" =~ ^(false|0|no|off)$ ]]; then
  exit 0
fi

# Sound directory - config file, then env var, then default
SOUNDS_DIR="${SOUNDS_DIR:-${PING_SOUNDS_DIR:-${CLAUDE_PLUGIN_ROOT}/sounds}}"
```

> **Why python3 over grep/cut?** Python3 is universally available on macOS and Linux, provides robust JSON parsing without edge-case failures (multiline values, escaped quotes, whitespace), and requires no additional dependency. The original grep-based approach had regex bugs (e.g., `\|` alternation requires `grep -E`) and would silently break on valid JSON variations.
>
> **Why not jq?** While `jq` is the standard CLI JSON processor, it is not pre-installed on macOS or many Linux distributions, adding a dependency that users would need to install separately. Python3 provides the same parsing robustness with zero install burden.
>
> Consider extracting config resolution into a separate `resolve-config.sh` helper to keep `notify.sh` focused on sound playback.

#### 2. Update `README.md` Documentation

The current README has contradictory advice: lines 99–107 recommend `PING_SOUNDS_DIR` for a stable path, then line 117 says it "has no effect." The docs update should **restructure the README**, not just append a new section:

1. Lead with the config file as the **recommended** approach
2. Move env var documentation to a "Legacy / Alternative" section
3. Remove the contradictory `PING_SOUNDS_DIR` recommendation
4. Consolidate the duplicated "Option 1" / "Alternative" blocks that repeat the same `PING_SOUND_*` example

```markdown
## Configuration (Recommended)

Create `~/.claude/ping-config.json`:

```json
{
  "$schema": "https://raw.githubusercontent.com/shrwnsan/vibekit-claude-plugins/main/plugins/ping/config-schema.json",
  "soundsDir": "~/custom-sounds",
  "sounds": {
    "sessionStart": "PeonReady1.wav",
    "userPrompt": "PeonYes4.wav",
    "notification": "PeonWhat3.wav",
    "stop": "PeonBuildingComplete1.wav"
  }
}
```

This works with hook events and survives plugin updates.

## Alternative: Environment Variables

Individual `PING_SOUND_*` variables in `settings.json` still work for per-sound overrides...
```

#### 3. Create `config-schema.json`

Add a JSON schema file for validation and IDE autocomplete support.

### Backward Compatibility

The implementation will maintain full backward compatibility:

1. **Environment variables still work** — Individual `PING_SOUND_*` env vars continue to override config
2. **No config file = default behavior** — Plugin works normally if no config exists
3. **Graceful degradation** — If JSON parsing fails, falls back to env vars and defaults

## Benefits

| Aspect | Current State | With Config File |
|--------|---------------|------------------|
| `PING_SOUNDS_DIR` support | ❌ Broken (hooks don't inherit env) | ✅ Works (file read by hook) |
| Configuration complexity | High (4 separate env vars or file copying) | Low (single config file) |
| Works with hooks | Partially (only per-sound vars) | Fully |
| IDE support | None | JSON schema autocomplete possible |
| Discoverability | Low (scattered docs) | High (single config file) |

## Open Questions

1. ~~**JSON parsing in bash**~~ — **Resolved**: Use `python3` for JSON parsing. It is universally available on macOS and Linux, handles all edge cases, and requires no additional dependency. See implementation section for rationale.

2. **YAML support** — **Resolved**: JSON-only initially. YAML parsing would require `python3 -c 'import yaml'` which depends on PyYAML (not in stdlib). JSON-only keeps things simple.

3. **Per-sound overrides in config** — **Resolved**: Yes, config file supports same granular overrides as env vars. Makes it a complete replacement.

4. **Config file naming** — **Resolved**: Using `ping-config.json` (more discoverable, not hidden). Aligns with user expectations.
   - **Recommendation**: JSON-only initially. YAML parsing would require `python3 -c 'import yaml'` which depends on PyYAML (not in stdlib). JSON-only keeps things simple.

3. **Per-sound overrides in config** — Should the config file support the same granular overrides as env vars?
   - **Recommendation**: Yes, makes config file a complete replacement for env vars

4. **Config file naming** — `ping-config.json` vs `.ping.json` vs `ping.json`?
   - `claude-statusline` uses `.claude-statusline.json` (dotfile convention)
   - **Recommendation**: Decide based on ecosystem convention. `ping-config.json` is more discoverable (not hidden); `.ping.json` aligns with `claude-statusline` pattern. Either works.

## Next Steps

If this approach is approved:

1. [ ] Create `docs/plans/tasks-00x-ping-config-file-implementation.md` with detailed implementation tasks
2. [ ] Implement config file parsing in `notify.sh` (using python3 for JSON parsing)
3. [ ] Consider extracting config resolution into `resolve-config.sh` helper
4. [ ] Create `config-schema.json` for IDE support (with `description` fields for documentation)
5. [ ] Restructure README.md — lead with config file, consolidate contradictory/duplicated sections
6. [ ] Add example config file (`ping-config.json.example`)
7. [ ] Test all scenarios (with/without config, with/without env vars, different OS, malformed JSON graceful fallback)

## References

- [claude-statusline config.ts](https://github.com/shrwnsan/claude-statusline/blob/main/src/core/config.ts)
- [claude-statusline config example](https://github.com/shrwnsan/claude-statusline/blob/main/.claude-statusline.json.example)
- [Ping plugin README](../plugins/ping/README.md)
- [Ping plugin hooks.json](../plugins/ping/hooks/hooks.json)
- [Ping plugin notify.sh](../plugins/ping/scripts/notify.sh)
