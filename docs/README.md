# Documentation Index

Project documentation for VibeKit Claude plugins.

## Directory Structure

```
docs/
├── plans/    # PRDs and task breakdowns (prd-*, tasks-*)
├── evals/    # Evaluations, research, and retrospectives (eval-*, research-*, retro-*)
├── guides/   # How-to guides (guide-*)
└── ref/      # Reference material (lowercase)
```

## Plans

### Product Requirements (`prd-*`)

| File | Title |
|------|-------|
| [prd-001](plans/prd-001-search-plus-enhancement.md) | Search Plus Enhanced Plugin |
| [prd-002](plans/prd-002-add-skills-to-search-plus-plugin.md) | Add Skills to search-plus Plugin |
| [prd-003](plans/prd-003-improve-search-plus-agent-discoverability.md) | Improve search-plus Agent Discoverability |
| [prd-004](plans/prd-004-self-referential-testing-and-skills-optimization.md) | Self-Referential Testing and Skills Optimization |
| [prd-005](plans/prd-005-plugin-optimizer.md) | Plugin Linter — Quality and Compliance Validator |
| [prd-006](plans/prd-006-base-plugin.md) | Base Plugin |
| [prd-007](plans/prd-007-meta-searching-standalone-skill.md) | Extract Meta-Searching into a Standalone Portable Skill |

### Task Breakdowns (`tasks-*`)

| File | Title |
|------|-------|
| [tasks-001](plans/tasks-001-prd-self-referential-testing-and-skills-optimization.md) | Self-Referential Testing and Skills Optimization |
| [tasks-002](plans/tasks-002-prd-security-compromise-error-testing.md) | Security Compromise Error Testing |
| [tasks-003](plans/tasks-003-handoff-context-improvements.md) | Handoff Context Improvements |
| [tasks-004](plans/tasks-004-handoff-context-reliability-improvements.md) | Handoff Context Reliability Improvements |

## Evaluations (`eval-*`)

| File | Title |
|------|-------|
| [eval-001](evals/eval-001-search-plus-error-resolution.md) | Search-Plus Plugin Technical Validation |
| [eval-002](evals/eval-002-marketplace-research-methodology.md) | Marketplace Research Methodology Evaluation |
| [eval-003](evals/eval-003-discovery-research-showcase.md) | search-plus Research Performance Analysis |
| [eval-004](evals/eval-004-current-llm-pricing-retrieval.md) | Claude Marketplace Aggregator Case Study |
| [eval-005](evals/eval-005-project-state-and-strategic-next-steps.md) | Project State and Strategic Next Steps |
| [eval-006](evals/eval-006-skill-invocation-ab-testing-framework.md) | Skill Invocation A/B Testing Framework |
| [eval-007](evals/eval-007-skill-invocation-real-vs-simulated-comparison.md) | Real vs Simulated Skill Invocation Test Results |
| [eval-008](evals/eval-008-search-plus-agent-ab-testing.md) | Search Plus Agent A/B Testing Framework |
| [eval-009](evals/eval-009-skill-auto-invocation-testing.md) | Natural Auto-Invocation Test Results |
| [eval-010](evals/eval-010-skill-real-execution-testing.md) | Real Claude Code Skill Invocation Test Results |
| [eval-011](evals/eval-011-testing-framework-code-review.md) | Testing Framework Code Review |
| [eval-012](evals/eval-012-search-solutions-comparative-analysis.md) | Claude Code Search Solutions Comparative Analysis |
| [eval-013](evals/eval-013-search-plus-fallback-case-study.md) | search-plus Fallback Case Study |
| [eval-013 appendix](evals/eval-013-search-plus-fallback-case-study-appendix-01.md) | Appendix A: Agent Execution Log |
| [eval-014](evals/eval-014-commit-implementation-comparison.md) | Base Plugin Commit Implementation vs Anthropic's Official Plugin |
| [eval-015](evals/eval-015-base-workflow-orchestrator.md) | Base Plugin Workflow Orchestrator Agent |
| [eval-016](evals/eval-016-search-plus-vs-built-in-websearch.md) | search-plus vs Built-in WebSearch Comparative Evaluation |
| [eval-017](evals/eval-017-vibekit-architecture-review.md) | VibeKit Plugin Marketplace Architecture Review |
| [eval-018](evals/eval-018-workflow-orchestrator-strategic-assessment.md) | Workflow Orchestrator Strategic Assessment |
| [eval-019](evals/eval-019-superpowers-plugin-analysis.md) | Superpowers Plugin Integration Analysis |
| [eval-020](evals/eval-020-handoff-context-invocation-methods.md) | Handoff Context Invocation Methods Reliability |
| [eval-021](evals/eval-021-handoff-context-improvements-from-everything-claude-code.md) | Handoff Context Improvements from everything-claude-code |
| [eval-022](evals/eval-022-skill-frontmatter-improvements.md) | Skill Frontmatter Improvements |
| [eval-023](evals/eval-023-test-output-filtering-usage-analysis.md) | Test Output Filtering Usage Analysis |
| [eval-024](evals/eval-024-ping-config-file-pattern.md) | Ping Config File Pattern |
| [eval-025](evals/eval-025-pretooluse-hook-security-review.md) | PreToolUse Hook Security & Correctness Review |

## Research (`research-*`)

| File | Title |
|------|-------|
| [research-001](evals/research-001-tavily-competitor-analysis.md) | Tavily Selection Decision-Making Process |
| [research-002](evals/research-002-marketplace-rebranding.md) | VibeKit Marketplace Rebranding |
| [research-003](evals/research-003-search-plus-localization.md) | search-plus Plugin Localization Strategy |
| [research-004](evals/research-004-plugin-generator-feasibility.md) | Plugin Generator Skill Feasibility |
| [research-005](evals/research-005-agent-enlistment-plugin.md) | Agent Enlistment Plugin Feasibility |
| [research-006](evals/research-006-tavily-jira-decision-matrix.md) | Tavily vs Jina.ai Service Selection Strategy |
| [research-007](evals/research-007-curse-jar-concept-exploration.md) | Curse Jar Concept Exploration |
| [research-008](evals/research-008-agent-skills-documentation-review.md) | Agent Skills Documentation Review and Best Practices |
| [research-009](evals/research-009-regression-testing-ai-sdlc-2026.md) | Regression Testing with AI in SDLC (2026) |

## Retrospectives (`retro-*`)

| File | Title |
|------|-------|
| [retro-001](evals/retro-001-prd-self-referential-testing-and-skills-optimization.md) | Command Output Pattern Learning in Self-Referential Testing |

## Guides

| File | Title |
|------|-------|
| [guide-testing](guides/guide-testing.md) | Search-Plus Plugin Testing Guide |

## Reference

| File | Title |
|------|-------|
| [architecture](ref/architecture.md) | Search-Plus Automated A/B Testing Architecture |

## Conventions

- **plans/**: `prd-{n}-{title}.md` for product requirements, `tasks-{n}-{title}.md` for implementation tasks
- **evals/**: `eval-{n}-{title}.md` for evaluations, `research-{n}-{title}.md` for research, `retro-{n}-{title}.md` for retrospectives
- **guides/**: `guide-{topic}.md` for how-to guides
- **ref/**: lowercase filenames for reference material
