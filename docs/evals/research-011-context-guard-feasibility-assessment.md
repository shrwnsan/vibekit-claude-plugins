# Research 011: Context Guard Feasibility Assessment

## Executive Summary

**Verdict: Dropped — pi-context-prune obsoletes this concept.** The proposed "Context Guard" plugin (warn when context bloats, suggest `/compact`) is superseded by [pi-context-prune](https://github.com/championswimmer/pi-context-prune), which actively *prunes* tool outputs, replaces them with LLM-generated summaries, and preserves recoverable access via `context_tree_query`. Furthermore, Claude Code's hook system **cannot prune context** — it can only inject `additionalContext`, not remove content from the payload sent to the model.

## Problem Statement

Long Claude Code / Pi sessions accumulate tool-call outputs that bloat context, degrading answer quality as the model loses signal in noise. The idea was a lightweight plugin that monitors context usage and warns the user to `/compact` before quality degrades.

## Research Findings

### What pi-context-prune does

pi-context-prune is a Pi extension that solves this problem completely:

| Capability | Description |
|---|---|
| **Batch capture** | Detects when assistant turns finish calling tools (`turn_end` event) |
| **Summarization** | Calls a configurable LLM (even a cheap model like Haiku) to generate compact summaries of tool-output batches |
| **Context rewriting** | Filters `ToolResultMessage`s from the context payload before the next LLM call, replacing them with summary messages |
| **Two-layer memory** | Hot path (compact summary in context) + cold path (full original outputs indexed and retrievable on demand) |
| **Data recovery** | `context_tree_query` tool lets the model retrieve any pruned output by `toolCallId` at any time |
| **Cache awareness** | Five trigger modes tuned for prefix/prompt cache stability |
| **Oversized-skip safeguard** | If a summary is larger than the raw text it replaces, pruning is skipped for that batch |

### Trigger modes

| Mode | Trigger | Cache impact | Use case |
|---|---|---|---|
| `every-turn` | After each tool-calling turn | High bust frequency | Debugging only |
| `on-context-tag` | When `context_tag` is called | User-controlled | Save-point workflows |
| `on-demand` | Only via `/pruner now` | Minimal (user decides) | Manual control |
| `agent-message` | When agent sends final text reply | One bust per work batch | **Default — best balance** |
| `agentic-auto` | Model calls `context_prune` tool | Depends on model discipline | Long autonomous sessions |

### Research backing

pi-context-prune is grounded in three papers on agent context optimization:

- **SUPO** (arXiv:2510.06727) — RL-trained agents with built-in summarization outperform standard agents on long-horizon tasks with same or less context
- **ReSum** (arXiv:2509.13313) — Recursive summarization enables unbounded exploration, achieving 4.5–12.7% gains over ReAct
- **ACON** (arXiv:2510.00615) — Optimized compression reduces peak tokens 26–54% while preserving accuracy; smaller models improve 20–46% with compression

## Why Context Guard Is Obsoleted

### Reason 1: Claude Code hooks cannot prune context

pi-context-prune's core mechanism requires **filtering the message array** before it reaches the model. Pi exposes a `context` event for this. Claude Code's `PostToolUse` hook can only:

- **Inject** `additionalContext` (adds content)
- **Not remove** existing tool results from the context payload

There is no Claude Code equivalent of Pi's `context` event. The proposed plugin could only *warn* about bloat, not *fix* it.

### Reason 2: Warn-only is thin value

A plugin that says "your context is 80% full, consider `/compact`" adds marginal value because:

- `/compact` already exists as a built-in Claude Code command
- Claude Code will likely add native auto-compaction in the future
- Users who care about context management will use Pi + pi-context-prune
- A rough estimate (tool call count × average output size) is too imprecise to be actionable

### Reason 3: The real solution already exists

pi-context-prune provides the full solution: active pruning, summarization, recovery, cache awareness, and a polished TUI (`/pruner tree`, `/pruner settings`, footer status widget). Building a "warn only" Claude Code plugin would be building a fraction of an already-shipped solution on a platform that can't support the most important half.

## Comparative Analysis

| Feature | pi-context-prune (Pi) | Context Guard (proposed, Claude Code) |
|---|---|---|
| Platform | Pi extension API | Claude Code hooks + skills |
| Active pruning | ✅ Rewrites context payload | ❌ Cannot — hooks can't remove content |
| Summarization | ✅ Configurable LLM summarizer | ❌ None |
| Data recovery | ✅ `context_tree_query` by toolCallId | N/A |
| Cache awareness | ✅ 5 modes, research-backed | N/A |
| Progress UI | ✅ TUI tree browser, overlay, footer widget | ❌ Would be text warnings only |
| Cost tracking | ✅ Summarizer token/cost stats | N/A |
| Session persistence | ✅ Index survives restarts and branch switches | ❌ Stateless |

## Conclusion

Context Guard is dropped from the plugin roadmap. The problem it aimed to solve (context bloat) is fully addressed by pi-context-prune for Pi users, and cannot be properly solved on Claude Code due to platform limitations (hooks cannot filter context payloads).

The remaining Tier 1 candidates from the June 2026 gap analysis are updated to:

1. **PR Flow** — `/commit` → push → PR in one command
2. **MCP Doctor** — MCP server lifecycle management
3. **Spend Tracker** — Session cost awareness (verify hook payload access first)
4. **Project Brief** — Structured onboarding output
5. **Dep Updater** — Automatable dependency workflow

## References

- [pi-context-prune](https://github.com/championswimmer/pi-context-prune) — Pi extension for context pruning
- [pi-context-usage](https://github.com/championswimmer/pi-context-usage) — Context size visualization for Pi
- [SUPO: Summarization augmented Policy Optimization](https://arxiv.org/abs/2510.06727)
- [ReSum: Recursive Summarization for Long-Horizon Agents](https://arxiv.org/abs/2509.13313)
- [ACON: Agent Context Optimization](https://arxiv.org/abs/2510.00615)
- [Anthropic Prompt Caching](https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching)
