# VibeKit: Productivity Plus Claude Code Plugin Marketplace

A curated collection of productivity-enhancing plugins for Claude Code, designed to solve common development challenges and improve your coding workflow.

**Why VibeKit?**
- 🚀 **Just Works**: Reliable plugins that handle Claude Code's limitations seamlessly
- 🎯 **Battle-Tested**: Proven solutions for real-world development problems
- 📚 **Well Documented**: Clear examples and comprehensive guides
- 🔧 **Zero Config**: Install and use immediately - no setup required

## 🧭 The Idea Behind VibeKit

Agentic development has six friction points, and each plugin targets one:

| Friction point | Plugin | The fix |
|---|---|---|
| **Inputs** — the agent stalls when the web says 403 | 🔍 [search-plus](#-search-plus) | Multi-provider fallback keeps the information supply reliable, even keyless |
| **Judgment** — agents execute well but decide poorly | 📏 [haku](#-haku) | A decide → spec → evidence loop with gate agents for the human-machine decision points |
| **Output** — vibes need hygiene | 🛠️ [base](#️-base) | Disciplined commits, quality gates, and worktree isolation before anything lands |
| **Attention** — long agent runs pull you out of flow | 🔔 [ping](#-ping) | Sound notifications call you back exactly when it's your turn |
| **Process** — every change pays the flat ceremony tax | ⏱️ [tempo](#️-tempo) | Risk-tiered loop: trivial changes skip ceremony, risky changes earn it |
| **Safety** — auto mode fires shell commands without a second look | 🛡️ [reflex](#️-reflex) | Typed allow/ask/deny gate decides before execution; uncertainty or failure hands the call back untouched |

The through-line: **remove the human as the bottleneck** — either by making the agent self-sufficient (search fallback, quality gates), pacing your attention (notifications, decision logs), pacing the agent's process to the task's risk (tempo), or spending the human's attention only where a calibrated gate says it's actually needed (reflex). And it stays deliberately low-dependency: search-plus works without API keys, ping needs no services, haku is process rather than API, tempo is structure rather than infrastructure, and reflex's local regex fast paths are keyless — without a provider key it simply steps aside.

## 🚀 Quick Start

Add this marketplace to Claude Code:

```bash
/plugin marketplace add shrwnsan/vibekit-claude-plugins
```

Browse available plugins and install search-plus:

```bash
/plugin
# Select "Browse and install plugins" and choose search-plus
```

### Verify Installation

Check that the plugin is working:

```bash
# Check available commands (should show /search-plus in custom-commands tab)
/help

# Test the enhanced search
/search-plus "Claude Code plugin documentation"

# Test URL extraction
/search-plus "https://docs.anthropic.com/en/docs/claude-code/plugins"

# Or invoke the search-plus agent
Use the search-plus agent to investigate a topic

# Or use the meta-search skill
Research latest web development trends
```

## 📦 Available Plugins

### 🛠️ Base

Essential workflow and context engineering tools for productive development. Includes intelligent git commit crafting, quality assurance automation, and workflow orchestration to streamline your development process.

**Key Features:**
- ✍️ **Smart Commit Messages**: Conventional commit formatting with co-authorship
- 🔄 **Workflow Orchestration**: Automated git workflows with quality gates
- 📊 **Quality Assurance**: Pre-commit hooks and validation automation
- ⚡ **Parallel Development**: Support for concurrent development tasks
- 🎯 **Systematic Debugging**: Structured approach to find root causes efficiently
- 🔗 **Handoff Context**: Natural language thread continuation with context preservation

**Example Usage:**
```bash
# Create intelligent git commits
/base:commit

# Run with verbose output
/base:commit --verbose

# Quick commit with automatic message
/base:commit --fast
```

[→ Detailed Documentation](plugins/base/README.md)

### 🔍 Search Plus

Enhanced web search with advanced error handling for 403, 429, 451, and connection issues that commonly occur when Claude Code attempts to research websites. Features multi-provider fallback (search: TinyFish → Tavily → Brave → Exa → Jina → keyless Firecrawl; extraction asks the origin for markdown first, then adds Defuddle and Wayback), structured failure detection, and reliable URL content extraction.

**Performance Results:**
- 🎯 **95%+ Success Rate**: From 0-20% baseline to reliable search (+400% improvement)
- 🚀 **Multi-Provider Fallback**: search and extraction continue past individual provider failures; manual strategies cover the rest
- 🎯 **Real-World Validation**: Successfully extracts from documentation, financial sites, and social media
- ⏱️ **Fast Response Times**: 2.3 seconds average with intelligent service selection
- 📊 **Zero Silent Failures**: Eliminates "Did 0 searches..." responses

**Multi-Service Architecture:**
- **Primary**: Tavily API for fast, reliable access (95-98% success, ~863ms avg)
- **Fallback**: Keyless services — Jina Reader, Firecrawl, Defuddle, and the Wayback Machine for extraction; keyless Firecrawl search when no API keys are configured
- **Smart Activation**: Only triggers fallback when needed (failed requests or empty content)
- **Zero Configuration**: Works out-of-the-box with free services

**Example Usage:**
```bash
# Search the web
/search-plus "latest React best practices"

# Extract content from URLs
/search-plus "https://docs.anthropic.com/claude-code"

# Use as an agent for research
@search-plus investigate latest web development trends
```

[→ Detailed Documentation](plugins/search-plus/README.md)

### 🔔 Ping

Sound notifications and alerts for Claude Code tasks. Get audio feedback when tasks complete, when Claude needs your input, or when sessions start/end.

**Key Features:**
- 🎵 **Session Events**: Sounds for session start and stop
- 💬 **User Prompts**: Audio alert when Claude needs your input
- 🔔 **Notifications**: General notification sounds
- 🎮 **Custom Sounds**: Use nostalgic game sounds or custom audio files
- 🖥️ **Cross-Platform**: Support for macOS, Linux, and Windows
- ⚙️ **Config File**: JSON configuration with IDE autocomplete support

**Platform Support:**
- **macOS**: Uses `afplay` command
- **Linux**: Uses `paplay` (PulseAudio) or `aplay` (ALSA)
- **Windows**: Uses PowerShell `Media.SoundPlayer`

**Configuration:**
```json
// ~/.claude/ping-config.json
{
  "soundsDir": "~/custom-sounds",
  "sounds": {
    "sessionStart": "PeonReady1.wav",
    "userPrompt": "PeonYes3.wav",
    "notification": "PeonWhat3.wav",
    "stop": "PeonBuildingComplete1.wav"
  }
}
```

[→ Detailed Documentation](plugins/ping/README.md)

### 📏 Haku

A lean leadership plugin for AI PMs, engineering managers, TPMs, and senior ICs who'd rather decide well than write fast. An always-on core—8 skills + 5 gate agents—runs the decide → spec → evidence loop; 8 opt-in role packs bolt on for product, people, comms, and engineering work.

**Key Features:**
- 🎯 **Decide → Spec → Evidence Loop**: capture intent, pressure-test specs with a red-team gate, log wins as merge evidence
- 🧠 **Compounding Memory**: `user-profile` anchor file — explain yourself once, get tailored output forever
- 🚪 **Gate Agents**: reducer, spec-writer, red-teamer, RFC-reviewer, retro-facilitator — judgment at the decision points
- 📦 **8 Opt-In Packs**: people, stakeholder, team, comms, leadership, engineering-ops, research, evals
- 🔍 **Routing Evals**: golden dataset gates every description change in CI
- 🩺 **Doctor**: health-checks your reflection data, backups, and pack installs

**License:** CC BY-SA 4.0 (the only non-Apache plugin here — vendored from its own upstream repo at tag `v0.5.0`)

[→ Detailed Documentation](plugins/haku/README.md)

### ⏱️ tempo

Safety-proportional process for agentic SDLC. Every task is tiered 0/1/2 by risk: trivial changes load no skills at all, standard changes get test-first with a single agent, risky changes get a plan file and a review gate. A ~10-line routing table at session start, not a philosophy lecture. Fail-twice auto-promotion and a verify-before-done gate hold at every tier.

**Measured** (one backend, hidden tests, medians of 3 runs per task; full table in the [tempo README](plugins/tempo/README.md#benchmarks)):

- 📊 **The process-flat tax is measurable**: a reference process-heavy plugin cost 1.2–2.7× tokens and 1.45–1.8× turns over bare Claude Code at identical correctness, on every tier
- 🎯 **tempo tier 2**: beat bare outright — 0.66× tokens with parity turns and wall-clock; the plan file and review gate paid for themselves
- 🎯 **tempo tier 0**: turns and wall-clock at the bare floor; tokens ~1.5× bare from fixed plugin overhead, visible only on the shortest tasks
- 🎯 **tempo tier 1**: on the re-based same-CLI comparison, near parity with the process-heavy reference — 0.79× its tokens, 0.91× its turns — while keeping test-first, the plan note, and full verification, and the fastest wall-clock of the three

**Example Usage:**
```bash
# Nothing to invoke for the common case — triage happens per task

# When you want it explicit:
/tempo:risk-triage      # classify the current task
/tempo:tier-2-risky  # force the risky flow
```

[→ Detailed Documentation](plugins/tempo/README.md)

### 🛡️ Reflex

A permission gate for Claude Code's auto mode. Before the built-in auto-mode classifier sees a shell command, reflex screens it: local regex rules instantly allow read-only commands, ask on secrets/key material, and deny unambiguous destruction, while risky-but-contextual commands go to a System One decision model (TypeSafe Jev, Liquid d1, or any compatible endpoint) that returns typed risk probabilities — allow / ask a human / deny. Hard invariant: reflex never allows outside auto mode; `REFLEX_ALL_MODES=1` extends ask/deny gating to other modes.

**Key Features:**
- 🎯 **Typed decisions, not prose**: allow/ask/deny from calibrated probabilities across destructive, exfiltration, and prod/shared-infra dimensions — not a chat model's gut feel
- ⚡ **Local fast paths**: read-only commands pass with zero latency; unambiguous destruction is denied without any model call
- 🪂 **Fails safe by construction**: provider error, timeout, or mid-band uncertainty hands the call back to Claude Code's own classifier untouched — reflex can only sharpen a decision, never loosen one
- 🔒 **Mode-scoped, secrets-aware**: gates in auto mode only (`REFLEX_ALL_MODES=1` opts into ask/deny elsewhere, `bypassPermissions` always excluded); a command naming `.env`/`.pem`/`id_rsa`-class material asks before the read-only fast path can allow it
- 🔁 **Provider cycle with failover**: Liquid and TypeSafe presets, custom specs for Vercel AI Gateway / OpenRouter / any System One-compatible endpoint; three consecutive failures bench a provider
- 🚨 **Kill switch**: `REFLEX_DISABLED=1` steps the whole gate aside
- 📊 **Every verdict logged**: one JSON line per decision in `~/.local/share/reflex/verdicts.jsonl`, model calls and errors included

**Main use case:** running Claude Code in auto-accept mode without blanket trust — especially in prod-adjacent or shared-infrastructure repos, where you want a machine-speed second opinion on shell commands and a hard stop on the obviously destructive.

**Enable it:**
```bash
/plugin install reflex@vibekit
export TYPESAFE_API_KEY=...  # or LIQUID_API_KEY — or point a spec at a localhost System One endpoint for zero egress
# start a new session, then watch decisions land:
tail -f ~/.local/share/reflex/verdicts.jsonl
```

**Metrics:** none published yet, deliberately. The deny/ask thresholds (0.85 / 0.55) are starting points, not truths — the verdict log accumulates labeled real traffic and the eval harness in [evals/reflex/](evals/reflex/) consumes the same format, so thresholds get tuned against your own usage rather than guessed. Numbers land in this section once real traffic has accumulated.

[→ Detailed Documentation](plugins/reflex/README.md)

## 🎯 What You Can Do

Our plugins help developers:

- **Gate Auto Mode**: Screen shell commands through a permission gate that fails safe before execution
- **Automate Git Workflows**: Create intelligent commits with proper formatting
- **Research Reliably**: Search the web without hitting rate limits or errors
- **Extract Web Content**: Pull information from documentation and tutorials
- **Boost Productivity**: Solve common development challenges with purpose-built tools
- **Handle Edge Cases**: Address limitations in Claude Code's native functionality

## 🤝 Community & Feedback

VibeKit is currently maintained as a solo project, but community feedback is invaluable! Here's how you can help improve it:

### 🐛 Report Issues
Found a bug or unexpected behavior? Please open an issue with:
- Clear description of the problem
- Steps to reproduce
- Expected vs actual behavior
- Your environment (OS, Claude Code version)

### 💡 Request Features
Have an idea for a new plugin or improvement? Please share:
- Use case and problem it solves
- Expected functionality
- Any relevant examples or references

### 📝 General Feedback
- What plugins do you find most useful?
- Any pain points in installation or usage?
- Suggestions for better documentation

### 📞 Stay Connected
- ⭐ **Star the repository** if you find VibeKit helpful
- 👀 **Watch for updates** when new plugins are released
- 🐛 **Report issues** at [github.com/shrwnsan/vibekit-claude-plugins/issues](https://github.com/shrwnsan/vibekit-claude-plugins/issues)

See [CONTRIBUTING.md](CONTRIBUTING.md) for details on reporting issues, requesting features, and providing feedback.

## 🏗️ Plugin Architecture

Each plugin includes:

- **Plugin Manifest**: Defines metadata and capabilities
- **Skills**: Auto-discoverable capabilities that Claude can use automatically
- **Custom Commands**: Slash commands for frequent operations
- **Specialized Agents**: Purpose-built AI agents for specific tasks
- **Hooks**: Custom behavior at key workflow points
- **MCP Servers**: External tool integrations (when applicable)

## 🛠️ Development

See [CONTRIBUTING.md](CONTRIBUTING.md) for:
- Project structure and guidelines
- How to create new plugins
- Security best practices
- Code style conventions

## 📄 License

This marketplace and all included plugins are licensed under the Apache License 2.0.

Copyright 2025 shrwnsan - Licensed under Apache 2.0

See the [LICENSE](LICENSE) file for complete license terms and conditions.

## 🙏 Acknowledgments

- Built with [Claude Code](https://claude.ai/code) plugin system
- Inspired by community needs and real-world development challenges
- Following standards from [agents.md](https://agents.md/) for AI agent compatibility

## 🔗 Links

- [Claude Code Documentation](https://docs.claude.com/en/docs/claude-code)
- [Plugin Development Guide](https://docs.claude.com/en/docs/claude-code/plugins)
- [Marketplace Documentation](https://docs.claude.com/en/docs/claude-code/plugin-marketplaces)
- [Issue Reporting](https://github.com/shrwnsan/vibekit-claude-plugins/issues)

---

**Made with ❤️ by the Claude Code community**
