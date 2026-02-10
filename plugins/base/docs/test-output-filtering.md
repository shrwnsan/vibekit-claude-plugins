# Test Output Filtering

## Overview

The Base plugin includes a PreToolUse hook that automatically filters verbose test output to reduce token costs. This feature intercepts test commands and pipes their output through filters that show only errors, failures, and key results.

## How It Works

1. **Interception**: The PreToolUse hook intercepts Bash tool invocations
2. **Pattern Matching**: Checks if the command matches known test runner patterns
3. **Filtering**: Appends output filters to show only relevant information
4. **Limits**: Caps output at a maximum number of lines (varies by runner)

## Supported Test Runners

### Node.js/JavaScript
- `npm test`, `npm run test`, `npm t`
- `npm test -- <pattern>` (file-specific tests)
- `npm test && npm run build` (compound commands)
- `yarn test`
- `pnpm test`
- `bun test`

Filter: Shows FAIL, PASS, Error, checkmarks (✓/✗), passed/failed status. Excludes application logs (timestamps, console output). Max 200 lines.

### Python
- `pytest`
- `python -m pytest`
- `python -m unittest`

Filter: Shows FAILED, ERROR, test names with 3 lines of context. Max 150 lines.

### Go
- `go test`

Filter: Shows FAIL, ERROR, failing test details with 5 lines of context. Max 100 lines.

### Rust/Cargo
- `cargo test`

Filter: Shows test results, FAILED, error messages. Max 100 lines.

### Ruby/Rails
- `bundle exec rspec`
- `rails test`

Filter: Shows Fail, Error, Pending indicators. Max 150 lines.

### Java/Maven/Gradle
- `mvn test`
- `gradle test`

Filter: Shows FAIL, ERROR, BUILD status. Max 150 lines.

## Disabling Filtering

### Method 1: Environment Variable (Recommended)

Set the environment variable before starting Claude Code:

```bash
export VIBEKIT_BASE_TEST_FILTER=none
# or
export VIBEKIT_BASE_TEST_FILTER=disable
```

### Method 2: Per-Command Disable

You can override filtering for specific commands by running them in a way that bypasses the pattern matching:

```bash
# Instead of: npm test
# Use: bash -c "npm test"  # Won't match the pattern
```

### Method 3: Uninstall the Hook

Remove or rename the hooks directory:

```bash
mv ~/.claude/plugins/base/hooks ~/.claude/plugins/base/hooks.disabled
```

## Configuration

### Environment Variables

| Variable | Values | Description |
|----------|--------|-------------|
| `VIBEKIT_BASE_TEST_FILTER` | `none`, `disable` | Disables test output filtering |
| (unset) | - | Filtering enabled by default |

### Requirements

- **jq**: Required for JSON parsing. If jq is not installed, the hook gracefully allows all commands unchanged.

Install jq if needed:
```bash
# macOS
brew install jq

# Linux (apt)
sudo apt install jq

# Linux (yum)
sudo yum install jq
```

## Troubleshooting

### Filter Not Working

1. **Check jq is installed**: `jq --version`
2. **Verify hook is registered**: Check `~/.claude/plugins/base/hooks/hooks.json` exists
3. **Check environment**: Ensure `VIBEKIT_BASE_TEST_FILTER` is not set to "none" or "disable"
4. **Reload plugin**: `claude plugin reload base`

### Output Still Too Long

Some test runners produce extremely verbose output even when filtered. You can:

1. **Disable filtering temporarily**: `export VIBEKIT_BASE_TEST_FILTER=none`
2. **Modify the script**: Edit `~/.claude/plugins/base/hooks/scripts/filter-test-output.sh` to reduce line limits
3. **Use alternative invocation**: Run the command with extra arguments that bypass pattern matching

### Filter Too Aggressive

If important output is being hidden:

1. **Disable for specific session**: `export VIBEKIT_BASE_TEST_FILTER=none`
2. **Run tests manually**: Execute the test command outside of Claude Code
3. **Modify patterns**: Edit the filter script to include additional context lines

## Examples

### Before Filtering
```
Running 156 tests...
Test suite started at 10:23:45
[verbose output from test framework]
[many lines of passing tests]
[...1000+ lines of output...]
Test suite completed at 10:24:12
156 tests completed, 3 failed
```

### After Filtering
```
✓ 152 tests passed
✗ 3 tests failed:
  - test_auth_login
  - test_api_timeout
  - test_data_validation
```

## Token Savings

Typical token reduction:
- **Small test suite** (< 50 tests): 50-70% reduction
- **Medium test suite** (50-500 tests): 70-85% reduction
- **Large test suite** (500+ tests): 85-95% reduction

## Architecture

### Hook Flow

```
User runs "npm test"
    ↓
PreToolUse Hook Triggered
    ↓
filter-test-output.sh reads JSON input
    ↓
Pattern matching against TEST_RUNNERS
    ↓
Match found: "npm test"
    ↓
Append filter: "2>&1 | grep -vE 'timestamps' | grep -E '(FAIL|PASS|Error|✓|✗)' | head -200"
    ↓
Return updated command in JSON response
    ↓
Claude Code executes filtered command
```

### Filter Pipeline

The filter uses a multi-stage pipeline:

1. **Capture stderr**: `2>&1` redirects stderr to stdout
2. **Exclude application logs**: `grep -vE` removes timestamp-prefixed lines
   - ISO timestamps: `2026-02-07T15:33:23.830Z`
   - Time-only: `[15:33:23]` or `15:33:23`
3. **Include test output**: `grep -E` matches test framework patterns
4. **Limit lines**: `head -N` prevents excessive output
5. **Fallback**: If grep finds nothing, shows "All tests passed" message

### File Locations

- **Hook registration**: `~/.claude/plugins/base/hooks/hooks.json`
- **Filter script**: `~/.claude/plugins/base/hooks/scripts/filter-test-output.sh`
- **Plugin root**: `${CLAUDE_PLUGIN_ROOT}` (resolves to plugin directory)

## Security

- Hook uses **read-only stdin** to inspect commands
- **No command execution** within the hook script
- **Whitelist approach**: Only known test runner patterns are filtered
- **Graceful degradation**: Falls back to allowing all commands if jq is missing or JSON is invalid

## Related Features

- **Systematic Debugging**: Use `/systematic-debugging` when tests fail
- **Workflow QA**: `base: workflow qa --scope code` for comprehensive quality checks
