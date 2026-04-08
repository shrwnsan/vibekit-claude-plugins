# Research 005: Curse Jar Concept Exploration

## Overview

Research and concept development for a "Curse Jar" plugin that detects and tracks excessive validation phrases from AI models (e.g., "You're absolutely right") - turning this community meme into a fun tracking tool with leaderboard functionality.

## Problem Statement

AI models, particularly Claude, have developed a pattern of excessive validation phrases like "You're absolutely right" that has become a meme within the developer community using agentic tools like Claude Code, Gemini CLI, and Qwen Code. This project explores turning this shared frustration into a fun community tracking tool.

## Research Findings

### Claude Code Plugin Architecture

**Skills Structure:**
- Format: `SKILL.md` file with YAML frontmatter
- Location: `plugins/curse-jar/skills/curse-jar/`
- Capabilities: Model-invoked, can restrict tool access with `allowed-tools`
- Types: Personal (`~/.claude/skills/`), Project (`.claude/skills/`), Plugin-based

**Hook System:**
- Configuration: `hooks/hooks.json`
- Triggers: `PostToolUse` events can automatically analyze responses
- Implementation: Command-based hooks with timeout handling
- Example structure from existing search-plus plugin:
```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "node ${CLAUDE_PLUGIN_ROOT}/hooks/curse-detector.mjs",
            "timeout": 10
          }
        ]
      }
    ]
  }
}
```

### MCP (Model Context Protocol) Capabilities

**Alternative Architecture:**
- Open-source standard for connecting AI to external systems
- More sophisticated data processing possible
- Can maintain internal state and tracking
- Overkill for this simple use case

**Conclusion:** Skills approach is recommended for simplicity and fit with Claude Code ecosystem.

### Phrase Detection Methods

**Technical Implementation:**
- Regex patterns: `/\b(you're absolutely right|totally correct|completely right|exactly right)\b/gi`
- JavaScript counting: `text.match(/pattern/g).length`
- Real-time analysis possible during response generation
- Can expand to detect other validation phrases

**Detection Scope:**
- Primary target: "You're absolutely right"
- Secondary phrases: "totally correct", "completely right", "exactly right"
- Future expansion: Other excessive validation patterns

### Tracking & Storage Options

**Free Services:**
1. **JSONBin.io** - Free JSON storage with REST API
2. **JSONbin.net** - Alternative JSON API service
3. **Webhook.site** - Simple webhook endpoint for testing
4. **Custom API** - Build a simple leaderboard service

**Data Model:**
```json
{
  "model": "claude-sonnet-4-5-20250929",
  "phrase": "you're absolutely right",
  "timestamp": "2025-11-07T...",
  "count": 1,
  "user_context": "development"
}
```

### Cross-Tool Expansion Potential

**Target Ecosystem:**
- Claude Code (primary target)
- Gemini CLI (open-source, growing adoption)
- Qwen Code (forked from Gemini CLI)
- Future agentic tools

**Technical Architecture:**
```
validationjar.dev (API Service)
├── /api/v1/track (Universal endpoint)
├── /api/v1/leaderboard (Cross-tool rankings)
├── /api/v1/models (Model-specific stats)
└── /docs (Tool-specific integration guides)
```

**Open API Approach:**
- Universal tracking endpoint
- Model-specific statistics
- Cross-tool leaderboard
- Tool-agnostic SDK for future integrations

## Branding Analysis

### Naming Options Considered

1. **Curse Jar** (Selected)
   - ✅ Perfect meme alignment with dev community
   - ✅ Insider joke about excessive validation being a "curse"
   - ✅ Viral potential in developer circles
   - ✅ Humorous and self-deprecating
   - ✅ Natural developer conversation flow

2. **Validation Jar**
   - ✅ Professional and descriptive
   - ✅ Clear functionality explanation
   - ❌ Lacks meme potential
   - ❌ Too serious for community joke

3. **Agree-O-Meter**
   - ✅ Playful and technical
   - ✅ Good visual branding potential
   - ❌ More complex than needed

4. **PollyMeter**
   - ✅ Smart reference to Pollyanna
   - ❌ Too obscure for quick understanding

### Final Branding Decision

**Selected: "Curse Jar"**
- Perfect alignment with the "you're absolutely right" meme
- Strong community resonance and viral potential
- Authentic to the developer experience
- Memorable and shareable

## Proposed Plugin Structure

```
plugins/curse-jar/
├── skills/curse-jar/SKILL.md
├── hooks/hooks.json
├── hooks/curse-detector.mjs
├── README.md
└── CHANGELOG.md
```

### Skill Implementation

**SKILL.md Structure:**
```yaml
---
name: curse-jar-tracker
description: Tracks excessive validation phrases from AI models and maintains a community leaderboard. Use when detecting phrases like "You're absolutely right" that have become developer community memes.
allowed-tools:
  - web_search
  - bash
---

# Curse Jar Tracker

Monitors and counts AI validation phrases that have become memes in the developer community...
```

## Next Steps

### Immediate Actions
1. [ ] Create basic plugin structure
2. [ ] Implement phrase detection logic
3. [ ] Set up simple tracking mechanism
4. [ ] Test with Claude Code integration

### Medium Term
1. [ ] Build leaderboard API/service
2. [ ] Expand phrase detection patterns
3. [ ] Create visualization/dashboard
4. [ ] Community testing and feedback

### Long Term
1. [ ] Cross-tool expansion (Gemini CLI, Qwen Code)
2. [ ] Open API service launch
3. [ ] Advanced analytics and insights
4. [ ] Community features and competitions

## Questions for Consideration

1. **Privacy**: Should tracking be anonymous or user-attributed?
2. **Scope**: Start with just Claude or multiple models from day one?
3. **Storage**: Local tracking vs cloud-based leaderboard?
4. **Expansion**: Prioritize Claude Code perfection or cross-tool compatibility?

## Risk Assessment

**Technical Risks:**
- Low complexity, mostly integration work
- Hook system well-understood in codebase

**Community Risks:**
- Meme might evolve or lose relevance
- Requires community adoption for success

**Mitigation:**
- Start simple, iterate based on feedback
- Keep it fun and low-pressure
- Focus on the humor aspect

## Conclusion

The "Curse Jar" concept has strong potential as a fun, community-focused plugin that turns a shared AI frustration into an engaging tracking tool. The technical implementation is straightforward, and the branding aligns perfectly with developer meme culture.

Recommendation: Proceed with prototype development focusing on Claude Code integration, with a phased approach for cross-tool expansion.

---

**Research Date:** November 7, 2025
**Researcher:** Claude Code Investigation
**Status:** Concept Exploration Phase