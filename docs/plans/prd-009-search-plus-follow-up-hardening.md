# PRD: Search-Plus Follow-Up Hardening

<!-- Version: 0.1.0 | Status: READY | Updated: 2026-10-10 -->

## Overview

A review of `main` after search-plus 3.3.0 (PRs #93, #95, #96, #98, #99) found that most PRD-008 follow-ups shipped as intended, but two items need more work:

1. A security gap introduced by the direct `Accept: text/markdown` fetch (#99).
2. A content-validation fix (#95) that changes metadata but not behavior.

This PRD sets priorities for those findings and the remaining provider work. It also records a design decision: **defer** the search-provider registry refactor, and say what would justify revisiting it.

## Goals

- Close the direct-fetch security gap in a standalone patch release (3.3.1).
- Make content validation able to move the extraction chain to the next provider, for high-confidence failure signals only.
- Give the keyed search providers (Tavily, Brave, Exa, Jina) offline test coverage, since CI cannot run them live.
- Stop the docs from drifting out of sync when providers are added.
- Add SearXNG with the existing provider pattern.

## Non-Goals

- Rewriting the provider architecture now (see "Deferred: provider registry").
- New keyed providers without benchmark evidence (see "Parallel").
- Changing the keyless defaults or the fallback order.

## Findings

### F1. Direct fetch can reach internal addresses (security, P0)

Before #99, the user's machine never requested the target URL; third-party extraction services did. #99 made the local process fetch the URL directly. Two gaps follow:

- **Redirects aren't re-validated.** `validateAndNormalizeURL` checks only the initial URL. `fetch` follows redirects by default, so a public URL can redirect to a loopback or private address and the request is still sent. Reproduced locally against a test service.
- **The blocklist is incomplete.** `isPrivateIP` does not cover `0.0.0.0/8`, which connects to localhost on Linux and macOS, or `100.64.0.0/10` and IPv6 loopback, link-local, unique-local and IPv4-mapped ranges.

**Impact:** the `text/markdown` content-type check limits what is returned to the model, but the request is sent either way. A malicious page could steer the agent into firing GET requests at local services.

**Fix:**
- Use `redirect: 'manual'` in the direct fetch and follow at most 5 hops, running `validateAndNormalizeURL` on each `Location`.
- Extend `isPrivateIP` with the missing IPv4 and IPv6 ranges.
- Check the status and `Content-Type` before reading the body, and cancel the body on a miss. Today the full HTML page is downloaded and discarded.

**Tests:** table tests for `isPrivateIP`, and a redirect-to-private-address test with a stubbed `fetch`. Both must fail on the current code.

**Release:** 3.3.1, shipped on its own and not bundled with other work.

### F2. Content validation is metadata-only (quality, P1)

#95 added parked-domain patterns to `validateMeaningfulContent`, but the result is only recorded in metadata. Success is still "any provider returned non-empty content". As a result, parked or placeholder pages exit 0 and never fall through to Defuddle or Wayback.

**Fix:** after each extraction attempt, treat **high-confidence** signals as a failed attempt and move to the next provider:
- parked-domain or placeholder pages
- empty content after trimming
- known provider error pages

Generic words such as "forbidden" or "rate limit" stay metadata-only, because real articles contain them.

**Tests:** a parked-page fixture moves past the first provider, and an article that mentions "403" does not.

### F3. Keyed providers have no offline coverage (testing, P1)

The Tavily, Brave, Exa and Jina search paths have only ever been verified manually with real keys.

**Fix:** stub `fetch` and run each existing provider function against a recorded, sanitized sample response. Check the normalized results (title, url, content, date) and the "no results" throw. No refactor is needed for this.

### F4. Docs drift on every provider change (docs, P1)

Each provider addition so far needed manual edits in several places: SKILL.md `allowedDomains`, both READMEs, CONFIGURATION.md and the CHANGELOG. Several of those edits were missed at first.

**Fix:** add a test that checks:
- every provider endpoint host appears in SKILL.md `allowedDomains`
- every `SEARCH_PLUS_*_API_KEY` used in the scripts is documented in the skill README

## Provider Work

### SearXNG (P2)

Implement as specified in PRD-008, following the existing pattern: one `try*` function, one transformer and one phase in `performHybridSearch`.

- Search only.
- `SEARCH_PLUS_SEARXNG_URL` is user-configured and may be a localhost address. That is expected; F1's private-address checks apply to user-supplied extraction URLs, not to this setting.

### Parallel (conditional)

Add it only if a benchmark on representative queries shows it beats an existing keyed provider on quality or cost. The plugin already has four keyed search providers, so a fifth needs a reason.

## Deferred: Provider Registry

### Design (kept for later)

Search providers differ only in:
- endpoint and method
- auth header
- where the query goes
- the path to the results array
- field names

A JS module of declarative specs, with an optional `parse()` escape hatch for quirky providers, plus one generic runner could replace the per-provider functions and their near-duplicate transformers. Array order would be the fallback order, and a missing key would mean the provider is skipped. A pure JSON file was considered and rejected: Wayback's two-step lookup, the direct-fetch guard, the `gh` CLI path, Tavily's `answer` field and similar quirks would need a template and path language and still wouldn't fit.

### Why not now

- The security and validation benefits of one central runner belong to the **extraction** chain (F1, F2), not to search. Search providers only call fixed vendor endpoints.
- The duplicated search code is stable and readable. No defect so far traces to the copies drifting apart; the drift has been in the docs (F4).
- Providers are added a few times a year, so SearXNG is roughly 75 lines with the current pattern versus roughly 10 as a spec. That saving is real but small.
- The refactor would rewrite exactly the paths CI cannot run live. F3 should come first.

### Revisit when any of these happens

- A bug fix has to be repeated across three or more provider functions.
- Adding providers becomes routine (several per release).
- Users ask to define their own providers without editing code. A user JSON file could then expose a declarative subset of the spec.

F3's recorded-response tests make the refactor low-risk whenever one of these happens.

## Sequencing

1. **3.3.1:** F1, the direct-fetch security fix.
2. F3 offline provider tests and F4 docs-sync test.
3. F2 per-attempt quality gate.
4. SearXNG.
5. Parallel and the registry refactor only if their conditions are met.

## Success Metrics

- F1: redirects to private or loopback addresses and `0.0.0.0` targets are rejected before any request is sent to them. The new tests fail on 3.3.0 and pass on 3.3.1.
- F2: a parked page falls through to the next provider, and articles that mention status codes are unaffected.
- F3/F4: the offline suite covers every keyed search provider and fails when a provider host or env var is missing from the docs.
- The skill keeps working end-to-end with zero API keys, and `claude plugin validate .` passes.

## Related

- [PRD-008: Search-Plus Optional Providers](prd-008-search-plus-optional-providers.md)
