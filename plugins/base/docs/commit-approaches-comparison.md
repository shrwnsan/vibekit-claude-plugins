# Commit Approaches: Skill vs Command

## Overview

The Base Plugin provides two distinct ways to create git commits, each optimized for different workflows and user preferences:

1. **crafting-commits Skill** - Intelligent automation that adapts to your changes
2. **/commit Command** - Explicit control with flexible CLI options

This guide helps you choose the right approach for your needs.

---

## Quick Reference

| Situation | Use | Example |
|-----------|-----|---------|
| **Daily development** | Skill | "help me commit these changes" |
| **Quick documentation fix** | Command (-f) | `/commit -f` |
| **Complex feature implementation** | Command (-v) | `/commit -v` |
| **Learning git best practices** | Skill | "draft a commit message for my API changes" |
| **When you're in a hurry** | Command (-f) | `/commit -f "fix typo"` |
| **Important commits** | Command (-v) | `/commit -v` |

---

## crafting-commits Skill

### What It Is
An intelligent assistant that automatically analyzes your changes and applies the appropriate level of sophistication based on the complexity and impact of your modifications.

### When It's Triggered
The skill automatically activates when you use phrases like:
- "help me commit"
- "draft a commit message"
- "create a proper commit"
- "write commit message for [changes]"
- "I need to commit these changes"
- "what should I commit this as"

### How It Works

#### 3-Tier Freedom System
- **Level 1 (Simple)**: Autonomous commits for fix, docs, style, chore
- **Level 2 (Complex)**: Validation required for feat, refactor, perf
- **Level 3 (Critical)**: Explicit approval for breaking changes

#### Model-Specific Optimization
- **Claude Haiku**: Fast, optimal for simple commits
- **Claude Sonnet**: Balanced approach for most scenarios
- **Claude Opus**: Comprehensive analysis for complex changes

### Strengths
- **Zero Configuration**: Works out of the box
- **Intelligent Analysis**: Automatically determines appropriate depth
- **Educational**: Teaches git best practices through examples
- **Comprehensive**: 409 lines of sophisticated logic covering edge cases
- **Error Recovery**: Detailed procedures for failed commits and conflicts

### Best Use Cases
1. **Regular Development Workflow** - When you want to focus on code, not commit formatting
2. **Learning Git Standards** - See how professionals structure commits
3. **Collaborative Projects** - Ensures consistent commit quality across team
4. **Complex Changes** - Handles intricate scenarios like breaking changes gracefully

### Example Interaction
```
You: help me commit these authentication changes

Claude (Skill): I'll analyze your changes and create an appropriate commit.
[Analyzes git status, diff, and recent commits]
This appears to be a feature addition with API changes.

I recommend:
feat(auth): add OAuth2 integration with JWT token support

Implement secure authentication using OAuth2 with JWT token management
including refresh tokens and session handling.

Co-Authored-By: GLM <zai-org@users.noreply.github.com>

Proceed with commit? [y/n]
```

---

## /commit Command

### What It Is
A slash command that gives you direct control over the commit process through CLI-style flags and explicit routing.

### Command Options
```bash
/commit                    # Auto-detects complexity and routes appropriately
/commit -f                 # Force fast mode for simple, routine changes
/commit --fast             # Same as -f
/commit -v                 # Force verbose mode for detailed analysis
/commit --verbose          # Same as -v
/commit "custom message"   # Use your message with validation
```

### How It Works

#### Route A (Simple Mode)
- Triggered by `-f/--fast` flag or simple change patterns
- Minimal validation, quick execution
- Best for: docs, style, simple fixes, chores

#### Route B (Detailed Mode)
- Triggered by `-v/--verbose` flag or complex changes
- Comprehensive analysis and multiple check-ins
- Best for: features, refactoring, breaking changes

### Strengths
- **Explicit Control**: You decide the level of detail
- **Predictable**: Same behavior every time for given flags
- **Power User Friendly**: Short flags for efficiency
- **Progressive Disclosure**: Simple by default, detailed when needed
- **Flexible Workflow**: Adapt approach based on context/time pressure

### Best Use Cases
1. **When You Know What You Want** - Explicit control beats auto-detection
2. **Time-Critical Situations** - `-f` for quick commits during rapid iteration
3. **Critical Changes** - `-v` for comprehensive review before important commits
4. **Consistent Patterns** - When you've established a routine and want speed

### Example Interactions

**Fast Mode:**
```bash
/commit -f

Git status shows:
M README.md
M package.json

Simple documentation changes detected.
Commit: docs: update installation guide and dependencies

Files committed: 2
Status: Clean
```

**Verbose Mode:**
```bash
/commit -v

Analyzing changes:
- src/auth.js (new OAuth2 implementation)
- src/utils/jwt.js (JWT token utilities)
- tests/auth.test.js (comprehensive test coverage)

I recommend 'feat' type for these files. Breaking changes detected in auth API.

Should I proceed with detailed analysis? [y/n]

[After user confirmation]
feat(auth)!: implement OAuth2 with JWT tokens

Breaking: Replaces basic auth with OAuth2 flow
Migration: Update client authentication to use OAuth2 endpoints

Fixes #123
Co-Authored-By: GLM <zai-org@users.noreply.github.com>

Proceed with commit? [y/n]
```

---

## Decision Guide

### Choose the Skill When:
- ✅ You want to learn git best practices
- ✅ Changes vary in complexity and you'd rather not think about categorization
- ✅ You're working on important features where quality matters most
- ✅ You appreciate intelligent automation that handles edge cases
- ✅ You want comprehensive error handling and recovery options

### Choose the Command When:
- ✅ You already know the appropriate commit style
- ✅ You need consistency in your workflow
- ✅ Time is a factor (use `-f` for speed)
- ✅ You're making routine changes and don't need analysis
- ✅ You prefer explicit control over automation

### Hybrid Workflow Example
Many users find value in using both:

```bash
# Daily development - let the skill handle it
"help me commit these bug fixes"

# Quick documentation tweaks while in flow state
/commit -f

# Important feature before a release
/commit -v

# Learning a new codebase
"analyze these changes and suggest a commit structure"
```

---

## Technical Details

### Implementation Differences

| Aspect | Skill | Command |
|--------|-------|---------|
| **Code Lines** | 409 (comprehensive) | 79 (focused) |
| **Autonomy** | High (intelligent routing) | User-directed |
| **Complexity** | Sophisticated (3-tier system) | Simple (binary routing) |
| **Error Handling** | Extensive recovery procedures | Basic git error handling |
| **Learning Curve** | Educational by design | Immediate productivity |

### Performance Characteristics
- **Skill**: Variable time based on change complexity and analysis depth
- **Command**: Consistent time based on selected mode (-f = fast, -v = thorough)

---

## Frequently Asked Questions

**Q: Which one produces better commit messages?**
A: Both follow conventional commit standards. The skill may produce more nuanced messages for complex changes, while the command gives you more control to adjust before committing.

**Q: Can I use both in the same project?**
A: Absolutely! They're designed to complement each other. Use whichever fits your current context and workflow.

**Q: Does the skill respect my project's commit conventions?**
A: Yes, it analyzes recent commits to match your project's style and scope patterns.

**Q: Will the command overwrite my custom message?**
A: No, if you provide a message with `/commit "custom message"`, it validates your message while maintaining your intent.

**Q: Which is better for team collaboration?**
A: The skill excels at maintaining consistency across teams, while the command helps team members establish shared patterns through explicit choices.

---

## Tips for Effective Use

### For Skill Users
1. **Be descriptive** when requesting commits: "help me commit these API changes with security implications"
2. **Trust the analysis** - the 3-tier system is based on professional git standards
3. **Learn from examples** - pay attention to how the skill structures different commit types

### For Command Users
1. **Use flags intentionally**: `-f` for speed, `-v` for quality
2. **Combine with workflow**: Make `/commit -f` your go-to for rapid iteration
3. **Review before commit** - even in fast mode, you'll have a final approval step

### For Hybrid Users
1. **Start with the skill** when learning or exploring
2. **Switch to command** when you've established patterns
3. **Use context** - consider time pressure, change importance, and your mental state

---

## Conclusion

Both approaches are designed to enhance your productivity while maintaining high commit quality standards. The choice depends on your workflow preferences, current context, and whether you value intelligent automation or explicit control.

The key is understanding that both tools work together to give you the right level of sophistication for the right moment. Use them both, and you'll have a comprehensive commit workflow that adapts to your needs.