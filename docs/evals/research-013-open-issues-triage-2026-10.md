# Research 013 — Open Issues Triage (2026-10)

- **Date**: 2026-10-29
- **Scope**: All 5 open GitHub issues reviewed against current code (#87, #38, #35, #22, #17)
- **Method**: Four parallel investigation agents (code verification + external research), key claims spot-checked against the working tree
- **Companion PR**: closes out #35, #38, #22, #17; #87 stays open for the fix

## Verdict summary

| Rank | Issue | Title | Verdict |
|------|-------|-------|---------|
| 1 | [#87](https://github.com/shrwnsan/vibekit-claude-plugins/issues/87) | URL validator blocks `*.com.<ccTLD>` domains | **KEEP — fix now** (confirmed reproducible + second bug found) |
| 2 | [#35](https://github.com/shrwnsan/vibekit-claude-plugins/issues/35) | meta-searching skill per Agent Skills best practices | CLOSE — done/superseded |
| 3 | [#38](https://github.com/shrwnsan/vibekit-claude-plugins/issues/38) | /review-arch follow-ups | CLOSE — stale/done (optional refile of test item) |
| 4 | [#22](https://github.com/shrwnsan/vibekit-claude-plugins/issues/22) | Mixbread addition to search fallback | CLOSE — obsolete (service pivoted) |
| 5 | [#17](https://github.com/shrwnsan/vibekit-claude-plugins/issues/17) | Gemini CLI / Qwen Code search offload | CLOSE — obsolete (free tiers gone; solved natively) |

## #87 — URL validator blocks `.com.<ccTLD>` — CONFIRMED, high priority

**Status: still fully reproducible.** Pattern is byte-identical to the issue's quote; only the line number drifted (943 at filing → 1166 today, from added SSRF code). Introduced 2026-04-08 (8fb35b6), untouched since — including by 1f86839 "fix validation false signals".

### Findings

1. **The reported bug** — `plugins/search-plus/skills/meta-search/scripts/content-extractor.mjs:1166` has `/\.com\.[a-z]/i` in the `problematicPatterns` array (lines 1160-1168, inside `validateAndNormalizeURL()`, function starts line 1045). Patterns are tested against the **full `normalizedURL` string** (lines 1170-1175); a match pushes `suspicious_domain_pattern` → invalid with "Unfixable URL issues: suspicious or test domain detected" (line 1182). `extractContent()` then returns `INVALID_URL` immediately (lines 1326→1329-1352) with **no fallback attempt**. Verified empirically: `https://www.amazon.com.au/` and `https://www.carousell.com.hk/` both rejected today.

2. **Second bug the issue missed** — adjacent line 1164 `/example\.com$/i` has no left anchor, so any host *ending in the substring* `example.com` is rejected: `https://notexample.com` and `https://www.getmyexample.com` both fail. Redundant: line 1116 already rejects true example.com/net/org **by hostname** with a proper `(^|\.)` anchor. Line 1164 should be deleted or hostname-anchored.

3. **Issue's suggested fix is directionally right but insufficient** — changing to `/\.com\.[a-z]{3,}/i` fixes the headline ccTLD cases (and uppercase is handled via `/i`; `.com.1` never matched either pattern and dies later at DNS), but because the array tests the whole URL, a path like `https://docs.example.com/guide.com.html` stays rejected even with `{3,}`. The check should be scoped to `hostname` (already computed at line 1097). Multi-label trade-off: `evil.com.au.attacker.com` is blocked today but would pass with `{3,}` — not an SSRF regression (DNS/IP checks at lines 1127-1156 still run) but worth a conscious decision. Punycode labels (`.com.xn--p1ai`) slip past `{3,}`; exotic, negligible.

### Test coverage

Zero coverage of the `suspicious_domain_pattern` path: tests/ has no `.com.` ccTLD, "suspicious", or "malformed TLD" cases; `ssrf.test.mjs` covers only the SSRF INVALID_URL paths (0.0.0.0, ::1, localhost subdomain/trailing-dot, rebinding). Offline suite green: 126 tests, 121 pass, 5 skipped (sandboxed api.github.com egress — the known normal skip). **No existing test would break with the fix.** Regression tests should accompany it: ccTLD URL passes, `example.com.bad` / `test.com.xyz` still rejected.

### Recommended fix sketch

- Scope `problematicPatterns` matching to `hostname`, not `normalizedURL`
- Change `/\.com\.[a-z]/i` → `/\.com\.[a-z]{3,}/i`
- Delete or hostname-anchor `/example\.com$/i` (line 1164)
- Add ccTLD + malformed-TLD regression tests
- search-plus patch bump in the same PR (content change → mandatory bump per repo convention)

## #35 — meta-search skill best-practices restructure — DONE/SUPERSEDED

The `meta-searching` skill no longer exists under that name. Timeline: renamed `meta-searching` on the issue's own filing date (cb4306a, 2025-12-29), then #76 (8fb35b6, 2026-04-08, v2.11.0) extracted the standalone `skills/meta-search/` layout; plugin now v3.5.0.

Per-ask status against the issue:

1. **Progressive disclosure split** — spirit addressed; literal ask obsolete. `SKILL.md` is 102 lines (well under the 500-line guidance that the issue's own reference research-008 cites; the issue's "<50 lines" target doesn't match current practice). No examples.md/troubleshooting.md, but the heavy lifting lives in executed scripts (zero context cost), and the one candidate extraction block (allowedDomains JSON, SKILL.md:64-95) duplicates README by design, enforced by `scripts/tests/docs-sync.test.mjs:124`.
2. **Condense description** — done. 426 chars with bolded warning → 200 chars plain (SKILL.md:3). The issue's suggested phrasing ("agent delegation for maximum reliability") is itself obsolete — the skill no longer delegates to an agent.
3. **Quick Start** — done in substance, no literal heading: SKILL.md:10-25 leads with the copy-paste `node "${CLAUDE_SKILL_DIR}/scripts/search.mjs" "<query-or-url>"`.
4. **Utility scripts** — done and far exceeded: bundled multi-provider CLI (`search.mjs` over `handle-web-search.mjs` and `content-extractor.mjs`, plus 9 modules and a 6-file offline test suite in CI). The issue's two shell helpers are superseded.

Also resolved along the way: `allowed-tools` corrected from the invalid `web_search`/`web_fetch` to `Bash(node *)`/`WebSearch`/`WebFetch`; naming moot after the rename.

**Residual:** repo-root `README.md:56` still says "Or use the meta-searching skill" — stale name, fixed in the companion PR. (`scripts/search-plus-skill-ab-testing.mjs:94` also carries the old name but is a historical A/B fixture — left as-is.)

## #38 — /review-arch follow-ups — STALE/DONE

`/review-arch` still exists (`plugins/base/commands/review-arch.md`, 56 lines) with both diagram formats and full guardrails. Per action item:

1. **[TEST] coverage** — still valid but low-value in current form: the command is prompt markdown, not code; nothing in plugins/base or CI tests it (search-plus-tests.yml only covers search-plus). Realistic "coverage" is a structural lint (frontmatter validity, guardrail strings present) — refile as that if wanted.
2. **[DOCS] split eval-017/018** — moot. Both moved to `docs/evals/` and are moderate length (634/449 lines); eval-017 already has a TOC; and the historical-records policy (eval-*.md immutable) now bars splitting/retrofitting. Only a NEW summary doc would be allowed; marginal value.
3. **[DOCS] Mermaid validation/fallback** — addressed structurally: the dual ASCII (terminal) + Mermaid (file output, "Recommended for GitHub/IDE rendering") design at review-arch.md:28-43 *is* the fallback. Gap is at most one sentence.
4. **[STYLE] bump to 1.3.0** — long superseded: marketplace metadata is 1.7.0, base plugin 1.12.0 (/review-arch shipped in base 1.5.0).

## #22 — Mixedbread search fallback — OBSOLETE

Mixedbread pivoted away from hosted search/embeddings APIs to **agentic search over private data** (Toast 1 search subagent, `stores.search`, Wholembed V3 built-in only, Silo vector DB). Homepage states it explicitly: *"They search the public web. Mixedbread searches your data"* — naming Exa, Parallel, and Firecrawl as the public-web alternatives. The issue's rate-limits link now documents generic stores-CRUD token buckets; no web-search endpoint exists. No integration surface for search-plus's public-web fallback chain (SearXNG → TinyFish → Tavily → Brave → Exa → Jina → keyless Firecrawl). Premise of the issue no longer exists.

Sources: [mixedbread.com](https://www.mixedbread.com/), [pricing](https://www.mixedbread.com/pricing), [rate limits](https://www.mixedbread.com/api-reference/rate-limits)

## #17 — Gemini CLI / Qwen Code offload — OBSOLETE

Two independent reasons:

1. **The economics inverted.** Both CLIs' free tiers died in 2026: Qwen Code's 2,000 req/day OAuth tier ended 2026-04-15 ([qwen-code#3233](https://github.com/QwenLM/qwen-code/issues/3233); OAuth login now fails outright), and Gemini CLI was sunset for individuals 2026-06-18 in favor of Antigravity (`agy`) ([The Register, 2026-05-20](https://www.theregister.com/ai-ml/2026/05/20/bye-bye-gemini-cli-google-nudges-devs-toward-antigravity/)). Both now require paid keys — they compete with a plain keyed HTTP provider on cost and lose on latency, determinism, and dependency weight.
2. **The capability already exists natively.** The "offload" is the bundled provider chain (`scripts/search.mjs`, `handle-web-search.mjs`, `content-extractor.mjs`); the "pre-flight" is the PostToolUse/PostToolUseFailure hook (`hooks/hooks.json` → `hook-entry.mjs`) that classifies 403/404/422/429/451/5xx and empty result sets, runs the recovery chain, and injects up to 9,500 chars of additionalContext inside a 25 s deadline; the delegate layer is the search-plus agent runbook (fallback gating, retry caps, dedupe, circuit breaker). A `gemini -p`/`qwen -p` subprocess path would duplicate the agent layer while adding heavyweight install, per-user paid auth, 30 s+ latency that blows the hook deadline, and NL output parsing vs deterministic HTTP JSON.

Deep multi-hop research belongs to the existing search-plus agent, not an external CLI.
