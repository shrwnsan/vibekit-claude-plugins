# research-012: Naming the Lean SDLC Plugin

**Status:** Complete — decision: `tempo`
**Date:** 2026-10-15
**Method:** terminology DD via meta-search (Tavily), plus a two-round adversarial
review by a Gilfoyle-persona reviewer subagent (round 1: attack all candidates;
round 2: attack the reviewer's own survivors; falsification criteria required).

## 1. Terminology landscape (Oct 2025 – Oct 2026)

What the field calls AI-driven SDLC, from search DD:

| Term | Status in 2026 | Relevance |
|---|---|---|
| **Agentic SDLC** / agentic software development | Dominant umbrella term; own summit (PortCon), framework site (ASDLC.io), Forrester report | The plugin's category |
| **Agentic engineering** | The discipline framing: "the bottleneck was never code generation — it was planning, review, and memory" | Confirms the PRD thesis (the 70% problem) |
| **Vibe coding → vibe engineering** | Vibe coding formally defined as "agent implements, human owns intent/review/verification"; vibe engineering (Willison) = the accountable end | VibeKit's origin story; the plugin is tooling for vibe engineering |
| **Spec-driven development** | Artifact-centric movement: GitHub Spec Kit, Amazon Kiro, OpenSpec, BMAD-METHOD | Adjacent; clix-dev-flow comparison lives here |
| **Verification debt** | Named pathology (Sonar): agent output outpacing checks | The plugin's tier-2 review gate is the answer |
| **Context engineering** | Adjacent hot term, paired with spec-driven development | Cache-first design speaks this language |

Positioning gap found: the market sells **more** structure. Nobody owns
**lean / safety-proportional** agentic SDLC.

## 2. Candidates considered and rejected

| Candidate | Cause of death |
|---|---|
| `swift` | Apple Swift collision; SEO dead on arrival (user's original placeholder) |
| `shape up` | Basecamp/37signals' product methodology — a famous free book; permanent "is this a Shape Up port?" confusion; two words |
| `sprint` | Scrum-generic, zero SEO distinctiveness; implies process-flat speed — the exact sin being fixed |
| `cadence` | Category-owned by Uber's workflow-orchestration engine (whose team forked it and renamed it **Temporal**); metaphor points backwards (a cadence resolves the *end* of a phrase); corporate-wallpaper connotation |
| `stride` | Fixed gait = process-flat speed; `/stride` hand-types into `/stripe` (Stripe ships an official MCP server, so both live in agent palettes); "took it in stride" reads as dismissing failures — poison for the auto-promotion feature |
| `torque` | Dead-HPC baggage (TORQUE Resource Manager); non-rhotic-accent homophone torque ≈ "talk" (UK/AU/NZ/India) breaks voice dictation; engine-not-process metaphor |
| `pace` | Strongest runner-up: best CLI grammar (`/pace 2` = tier 2 with zero docs) but /peɪs/ is one phoneme from "paste" in dictation; names the outcome (leanness), not the mechanism (tiered process) |
| 14 hybrids (`gait`, `dose`, `pareto`, `gear`, `giusto`, `throttle`, `tack`, …) | Killed individually in review; see §4 for the structural reason none could work |

## 3. Decision: `tempo`

Rationale, distilled from the adversarial review:

1. **Metaphor fit.** Process tempo matched to task risk: tier 0 runs allegro with
   no development section, tier 2 runs adagio with full orchestration. Under the
   tagline "safety-proportional process," name and thesis argue for each other.
2. **Clean namespace by structure.** Claude Code plugins have no npm/PyPI/CLI
   squatting axis — invocation is `vibekit:tempo`, skills are `tempo:*`. Technical
   collision is zero; what remains is search and mental model.
3. **Collisions are an attention tax, not a conflation.** Grafana Tempo
   (tracing), Tempo Software (Jira timesheets), tempo.new (AI React builder — same
   audience, so the heaviest tax). None is conceptually confusable with an SDLC
   process plugin; the mistake resolves in one query refinement.
4. **i18n.** Global loanword (テンポ; near-identical in ES/FR/DE/PT); only
   candidate every team pronounces the same way.
5. **Failure modes are charming, not damaging.** "Tempo drift" is a good bug title;
   "the agent went rubato" is a feature joke, not a bug joke.

## 4. Structural insight from the review

The thesis is *proportional effort* — an abstract relation, and **abstract
relations don't compress into unowned nouns**: every head-on name is owned
(`gauge`, `pareto`), homophone-fragile (`dose` → "DoS", `gait` → "gate",
`weight` → "wait"), or lectureware (`giusto`). Tempo survives because it
approaches proportionality **sideways, through rhythm** — the sideways approach
*is* the mechanism. Any future rename search should look for sideways metaphors,
not literal ones.

## 5. Falsification criteria (any one retires the name; `pace` inherits)

1. A same-category AI-coding product named Tempo ships a real locally-installed
   presence (CLI/IDE extension) — "tempo" becomes a binary in a dev's PATH.
2. Marketplace/search telemetry shows "tempo" queries resolving to non-VibeKit
   results at a sustained rate above ~30%. An attention tax is acceptable; a
   discovery failure is not.
3. Recurring (not one-off) pattern of wrong-Tempo bug reports or "is this the
   tempo AI builder?" questions in the issue tracker.

## Sources

- [ASDLC.io — Agentic Software Development Life Cycle](https://asdlc.io)
- [Port — The Agentic SDLC](https://port.io/blog/agentic-sdlc)
- [Sonar — What is Agentic SDLC](https://www.sonarsource.com)
- [Keyhole — Vibe Coding Trends 2026 data](https://keyholesoftware.com)
- [daily.dev — Vibe Coding Explained 2026](https://daily.dev/blog/vibe-coding-explained-2026)
- [GitHub Blog — Spec Kit / spec-driven development](https://github.blog/ai-and-ml/generative-ai/spec-driven-development-with-ai-get-started-with-a-new-open-source-toolkit)
- Vendor pages encountered in collision DD: Grafana Tempo, Tempo Software, tempo.new, Uber Cadence/Temporal, TORQUE Resource Manager, Quali Torque
