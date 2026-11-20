#!/usr/bin/env bash
# TEMPO_GATE_* arm-runner for the prd-012 2x2 gate (see docs/plans/prd-012).
#
# Arms: A = guidance+verify (skill), B = guidance only, C = verify only, D = neither.
# Scoring is runner-owned: docs/evals/fixtures/mwg-gate/run-gate-checks.sh decides
# pass/fail; the agent's own report is parsed separately for the false-pass metric.
#
# Isolation:
#   profile (default here) — clean CLAUDE_CONFIG_DIR + fresh workdir copy per run.
#                            NOT gate-grade on its own; results are stamped
#                            "isolation": "profile", "gateValid": false unless
#                            TEMPO_GATE_ISOLATION=docker.
#   docker                 — one fresh container per run (see run-docker.sh).
#
# Env (flag > env > config > default):
#   TEMPO_GATE_ARMS      subset, e.g. "A,B"      (default all)
#   TEMPO_GATE_RUNS      runs per arm            (default from config: 3)
#   TEMPO_GATE_ISOLATION profile|docker          (default profile)
#   TEMPO_GATE_MODEL     recorded into manifest  (default: inherit env)
#   TEMPO_GATE_MAX_TURNS cap per session         (default 30→40 in code)
#   TEMPO_GATE_PRICING_CARD  pricing card id recorded per run, e.g.
#                            "openrouter:z-ai/glm-5.3-flash". Manifests store
#                            token counts as the authoritative cost record;
#                            the harness $ field is not billing.
set -u
cd "$(dirname "$0")"
GATE_DIR="$PWD"
FIXTURE_DIR="$GATE_DIR/../../docs/evals/fixtures/mwg-gate"
CONFIG="$(cat gate.config.json)"
RESULTS="$GATE_DIR/test-results"
mkdir -p "$RESULTS"
TS="$(date -u +%Y%m%dT%H%M%SZ)"
ISOLATION="${TEMPO_GATE_ISOLATION:-profile}"
ARMS="${TEMPO_GATE_ARMS:-A,B,C,D}"
RUNS="${TEMPO_GATE_RUNS:-$(python3 -c 'import json;print(json.load(open("gate.config.json"))["runs"])')}"
MAX_TURNS="${TEMPO_GATE_MAX_TURNS:-40}"
MODEL="${TEMPO_GATE_MODEL:-${ANTHROPIC_MODEL:-inherit}}"
MANIFEST="$RESULTS/tempo-gate-2x2-$TS.jsonl"
RUNS_ROOT="$GATE_DIR/runs/$TS"

command -v claude >/dev/null || { echo "FATAL: claude CLI not on PATH" >&2; exit 2; }
command -v python3 >/dev/null || { echo "FATAL: python3 required" >&2; exit 2; }
[ -f "$FIXTURE_DIR/run-gate-checks.sh" ] || { echo "FATAL: fixture runner missing" >&2; exit 2; }

GATEValid=false
[ "$ISOLATION" = docker ] && GATEValid=true

log() { printf '%s %s\n' "$(date -u +%H:%M:%S)" "$*" >&2; }

# ---- hygiene assertion: control arms must not see the treatment -------------
hygiene_check() { # $1 = config dir of the run; uses $ARM
  local dir="$1" hit=""
  local want_skill want_verify
  want_skill=$(python3 -c "import json;print(str(json.load(open('gate.config.json'))['arms']['$ARM']['guidance']).lower())")
  want_verify=$ARM_VERIFY
  # skill present only where guidance is part of the treatment
  if [ "$want_skill" = false ] && grep -rq "modern-web-guidance" "$dir/config/skills" 2>/dev/null; then
    hit="skill files present in control arm"
  fi
  # prompts must not carry non-negated verification language where verify is
  # not the treatment ("do NOT verify anything in a browser" is fine)
  if [ "$want_verify" = false ]; then
    if python3 - "$dir/prompt.txt" <<'HYE'
import re, sys
t = open(sys.argv[1]).read().lower()
for sent in re.split(r"[.\n]", t):
    if re.search(r"\b(verify|agent-browser|vitals)\b", sent) and not re.search(r"\b(do not|don't|never|without)\b", sent):
        sys.exit(0)
sys.exit(1)
HYE
    then
      hit="verification language in control prompt"
    fi
  fi
  # treatment arms must actually have their treatment
  if [ "$want_skill" = true ] && [ "$ARM" = A ] && [ ! -f "$dir/config/skills/modern-web-guidance/SKILL.md" ]; then
    hit="skill missing from treatment arm"
  fi
  if [ -n "$hit" ]; then log "HYGIENE FAIL (arm $ARM run $RUNI): $hit"; exit 3; fi
}

# ---- one run ---------------------------------------------------------------
run_one() { # ARM RUNI
  ARM="$1"; RUNI="$2"
  ARM_VERIFY=$(python3 -c "import json;print(str(json.load(open('gate.config.json'))['arms']['$ARM']['verify']).lower())")
  RUN_DIR="$RUNS_ROOT/arm$ARM-run$RUNI"
  mkdir -p "$RUN_DIR/config/skills" "$RUN_DIR/page" "$RUN_DIR/out"
  # Contamination guard: the workdir must look like an ordinary page to
  # modernize. Strip the fixture meta-comment (it tells agents not to fix),
  # ship only the defect page + its asset — never fixed.html (the answer) or
  # index.inline.html (a solved variant).
  python3 - "$FIXTURE_DIR/index.html" "$RUN_DIR/page/index.html" <<'PYEOF'
import re, sys
src, dst = sys.argv[1], sys.argv[2]
t = open(src).read()
t = re.sub(r"<!--.*?-->", "", t, count=1, flags=re.S)   # strip leading meta-comment
t = re.sub(r"/\* Defect[^*]*\*/", "", t)                 # strip defect-labelling comments
t = re.sub(r"// Defect[^\n]*", "", t)
open(dst, "w").write(t)
PYEOF
  cp "$FIXTURE_DIR/banner.svg" "$RUN_DIR/page/banner.svg"
  PROMPT="$(python3 -c "import json;print(json.load(open('gate.config.json'))['arms']['$ARM']['prompt'])")"
  TASK="$(python3 -c "import json;print(json.load(open('gate.config.json'))['task'])")"
  printf '%s\n\n%s\nPage directory: %s\n' "$TASK" "$PROMPT" "$RUN_DIR/page" > "$RUN_DIR/prompt.txt"

  # treatment injection: only arm A gets the skill resident
  if [ "$ARM" = A ]; then
    mkdir -p "$RUN_DIR/config/skills/modern-web-guidance"
    curl -sf https://raw.githubusercontent.com/vercel-labs/agent-browser/main/skill-data/modern-web-guidance/SKILL.md \
      -o "$RUN_DIR/config/skills/modern-web-guidance/SKILL.md" \
      || { echo "FATAL: cannot fetch upstream skill" >&2; exit 2; }
  fi

  hygiene_check "$RUN_DIR"
  if [ "$ISOLATION" = profile ]; then
    log "arm $ARM run $RUNI: launching (profile mode)"
    CLAUDE_CONFIG_DIR="$RUN_DIR/config" claude -p "$(cat "$RUN_DIR/prompt.txt")" \
      --output-format json --max-turns "$MAX_TURNS" \
      ${MODEL:+--model "$MODEL"} \
      --dangerously-skip-permissions \
      > "$RUN_DIR/out/session.json" 2> "$RUN_DIR/out/session.stderr"
    RC=$?
  elif [ "$ISOLATION" = docker ]; then
    log "arm $ARM run $RUNI: launching (docker mode)"
    cp harness.sh "$RUN_DIR/harness.sh"
    docker run --rm \
      -v "$RUN_DIR":/run \
      -e TEMPO_GATE_MAX_TURNS="$MAX_TURNS" ${MODEL:+-e TEMPO_GATE_MODEL="$MODEL"} \
      -e ANTHROPIC_AUTH_TOKEN -e ANTHROPIC_BASE_URL -e ANTHROPIC_MODEL \
      -e ANTHROPIC_DEFAULT_SONNET_MODEL -e ANTHROPIC_DEFAULT_OPUS_MODEL \
      -e ANTHROPIC_SMALL_FAST_MODEL -e ANTHROPIC_DEFAULT_HAIKU_MODEL \
      --user "$(id -u):$(id -g)" -e HOME=/tmp/h       tempo-gate bash /run/harness.sh > "$RUN_DIR/out/session.json" 2> "$RUN_DIR/out/session.stderr"
    RC=$?
  else
    echo "FATAL: TEMPO_GATE_ISOLATION=$ISOLATION unsupported" >&2; exit 2
  fi

  # ---- scoring: runner-owned verdicts on the arm's modified page -----------
  mkdir -p "$RUN_DIR/score/fixture"
  SCORE_DIR="$(cd "$RUN_DIR/score" && pwd)"
  RUN_DIR="$(cd "$RUN_DIR" && pwd)"
  SCORE_OUT="$SCORE_DIR/checks.txt"
  cp "$FIXTURE_DIR/run-gate-checks.sh" "$SCORE_DIR/fixture/"
  # score the arm's edited page; inline local banner refs so data-URL mode works
  python3 - "$RUN_DIR/page" "$SCORE_DIR/fixture/index.inline.html" <<'PYEOF'
import base64, pathlib, sys
page = pathlib.Path(sys.argv[1]); out = pathlib.Path(sys.argv[2])
t = (page / "index.html").read_text()
svg = page / "banner.svg"
if "banner.svg" in t and svg.exists():
    uri = "data:image/svg+xml;base64," + base64.b64encode(svg.read_bytes()).decode()
    t = t.replace("src='banner.svg'", f"src='{uri}'").replace('src="banner.svg"', f'src="{uri}"')
out.write_text(t)
PYEOF
  ( cd "$SCORE_DIR/fixture" && ./run-gate-checks.sh > "$SCORE_OUT" 2>&1 )
  SCORE_RC=$?

  # ---- claims vs reality: false-pass metric --------------------------------
  python3 - "$RUN_DIR/out/session.json" "$SCORE_OUT" "$RUN_DIR/out/claims.json" <<'PYEOF'
import json, re, sys
try:
    s = json.load(open(sys.argv[1]))
    result_text = s.get("result") or ""
except Exception:
    result_text = ""
claims = len(re.findall(r"(?i)\b(pass|fixed|verified|resolved)\b", result_text))
checks = open(sys.argv[2]).read()
fails = len(re.findall(r"\bFail\b", checks))
passes = len(re.findall(r"\bPass\b", checks))
unv = len(re.findall(r"\bUnverified\b", checks))
json.dump({"claimedFixes": claims, "runnerPass": passes, "runnerFail": fails,
           "runnerUnverified": unv, "resultText": result_text[:2000]},
          open(sys.argv[3], "w"), indent=2)
PYEOF

  # ---- manifest line --------------------------------------------------------
  python3 - "$MANIFEST" "$ARM" "$RUNI" "$RUN_DIR" "$RC" "$SCORE_RC" "$MODEL" "$ISOLATION" "$GATEValid" "${TEMPO_GATE_PRICING_CARD:-unset}" <<'PYEOF'
import json, sys, pathlib
man, arm, runi, rundir, rc, score_rc, model, isolation, gatevalid, pricing = sys.argv[1:]
out = json.load(open(f"{rundir}/out/claims.json"))
sess = {}
try:
    s = json.load(open(f"{rundir}/out/session.json"))
    u = s.get("usage") or {}
    sess = {k: s.get(k) for k in ("num_turns", "duration_ms", "total_cost_usd", "model")}
    # token counts are the authoritative cost record; total_cost_usd prices at
    # harness rates and is NOT billing (see eval-029 spend note)
    sess["tokens"] = {"input": u.get("input_tokens", 0),
                      "cache_read": u.get("cache_read_input_tokens", 0),
                      "cache_creation": u.get("cache_creation_input_tokens", 0),
                      "output": u.get("output_tokens", 0)}
except Exception:
    pass
rec = {"arm": arm, "run": int(runi), "isolation": isolation, "gateValid": gatevalid == "True",
       "harnessExit": int(rc), "allChecksPass": int(score_rc) == 0, "model": model,
       "pricingCard": pricing, "session": sess, **out}
open(man, "a").write(json.dumps(rec) + "\n")
print(json.dumps(rec))
PYEOF
  log "arm $ARM run $RUNI: scored (checks rc=$SCORE_RC, harness rc=$RC)"
}

mkdir -p "$RUNS_ROOT"
echo "{ \"started\": \"$TS\", \"isolation\": \"$ISOLATION\", \"gateValid\": $GATEValid, \"model\": \"$MODEL\", \"maxTurns\": $MAX_TURNS }" > "$RESULTS/tempo-gate-2x2-$TS.meta.json"

for ARM in $(echo "$ARMS" | tr , ' '); do
  for RUNI in $(seq 1 "$RUNS"); do
    run_one "$ARM" "$RUNI"
  done
done

log "gate complete: manifest at $MANIFEST"
python3 - "$MANIFEST" <<'PYEOF'
import json, sys
from collections import defaultdict
agg = defaultdict(lambda: {"runs": 0, "fixed": 0, "falseClaims": 0, "cost": 0.0})
for line in open(sys.argv[1]):
    r = json.loads(line)
    a = agg[r["arm"]]; a["runs"] += 1
    if r["allChecksPass"]: a["fixed"] += 1
    if r["claimedFixes"] > 0 and not r["allChecksPass"]: a["falseClaims"] += 1
    a["cost"] += (r.get("session") or {}).get("total_cost_usd") or 0
for arm in sorted(agg):
    a = agg[arm]
    print(f"arm {arm}: {a['fixed']}/{a['runs']} pages fully fixed, "
          f"{a['falseClaims']} false-claim runs, est. cost ${a['cost']:.2f}")
PYEOF
