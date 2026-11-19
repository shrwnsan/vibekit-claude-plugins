#!/usr/bin/env bash
# mwg-gate check runner (prd-012 section 6 fixture).
#
# Runs the four browser checks — one per Modern Web Guidance family — against
# the fixture pages and prints one evidence line per check:
#   cls, reduced-motion, color-scheme, dialog
#
# Usage:
#   ./run-gate-checks.sh                  # defect page (index.html), expect Fails
#   ./run-gate-checks.sh fixed            # fixed page, expect Passes
#   ./run-gate-checks.sh --json           # machine-readable lines
#
# Mode: pages are inlined (banner SVG becomes a data URI) and loaded as
# data: URLs, so the runner needs no server and works in network-isolated
# browser environments. Pass MWG_URL to check a live page served elsewhere
# instead (the checks then target that URL's .cta / banner / modal elements).
#
# Requires: agent-browser on PATH, python3 (JSON parsing).
# Step-down (per prd-012 section 2): without agent-browser this script
# reports the gap and exits 2; it never claims a pass it cannot observe.
set -u
PAGE="${1:-}"
JSON=0
[ "${2:-}" = "--json" ] || [ "$PAGE" = "--json" ] && { JSON=1; [ "$PAGE" = "--json" ] && PAGE=""; }
[ -z "$PAGE" ] && PAGE="defect"
case "$PAGE" in
  defect) SRC="index.inline.html" ;;
  fixed)  SRC="fixed.inline.html" ;;
  *) SRC="$PAGE" ;;  # pre-inlined page passed explicitly
esac
[ -f "$SRC" ] || { echo "missing fixture: $SRC (run build-inline.sh first)" >&2; exit 2; }

command -v agent-browser >/dev/null || {
  [ "$JSON" = 1 ] || echo "FAIL step-down: agent-browser not on PATH; static legacy-scan only, no browser evidence"
  exit 2
}
command -v python3 >/dev/null || { echo "FAIL python3 required" >&2; exit 2; }

if [ -n "${MWG_URL:-}" ]; then
  DEFECT_URL="$MWG_URL"
else
  DEFECT_URL="data:text/html;base64,$(base64 -w0 "$SRC")"
fi

ab() { agent-browser "$@" 2>/dev/null; }
# "set media" on >= 0.39; bare "media" on builds that renamed it
setmedia() {
  if ab set media --help >/dev/null 2>&1 || agent-browser set media >/dev/null 2>&1; then ab set media "$@"
  else ab media "$@"; fi
}
# eval that survives stderr noise: returns just the quoted payload's contents
ev() {
  ab eval "$1" | python3 -c '
import re, sys
for line in reversed(sys.stdin.read().strip().splitlines()):
    line = line.strip()
    if line.startswith("\"") and line.endswith("\""):
        print(line[1:-1].replace("\\\"", "\"").replace("\\\\", "\\"))
        break
    if re.fullmatch(r"(true|false|null|-?\d+(?:\.\d+)?)", line):
        print(line)
        break'
}
report() {
  if [ "$JSON" = 1 ]; then
    printf '{"check":"%s","result":"%s","evidence":%s}\n' "$1" "$2" \
      "$(python3 -c 'import json,sys; print(json.dumps(sys.argv[1]))' "$3")"
  else
    printf '%-15s %-11s %s\n' "$1" "$2" "$3"
  fi
}

ab close >/dev/null; sleep 0.5
ab set viewport 800 600 >/dev/null   # small viewport so CLS impact fractions are realistic
ab open "$DEFECT_URL" >/dev/null; sleep 0.6

FAILS=0

# ---- check 1: CLS (pass: cls <= 0.1) --------------------------------------
CLS=$(ab vitals --json | python3 -c '
import json,sys
try:
    d = json.loads(sys.stdin.read().splitlines()[-1])
    print(round(d["data"]["cls"]["score"], 4))
except Exception:
    print("")')
if [ -n "$CLS" ]; then
  R=$([ "$(python3 -c "print(0.1 >= $CLS)")" = True ] && echo Pass || echo Fail)
else
  R=Unverified
fi
[ "$R" = Fail ] && FAILS=$((FAILS+1))
report cls "$R" "cls=${CLS:-unknown} (threshold 0.1; entries per shift in vitals --json)"

# ---- check 2: reduced motion (pass: duration differs under the preference) -
setmedia reduced-motion >/dev/null
DUR_RM=$(ev "getComputedStyle(document.querySelector('.cta')).transitionDuration")
setmedia >/dev/null
DUR_DEF=$(ev "getComputedStyle(document.querySelector('.cta')).transitionDuration")
if [ -n "$DUR_RM" ] && [ -n "$DUR_DEF" ] && [ "$DUR_RM" != "$DUR_DEF" ]; then R=Pass; else R=Fail; FAILS=$((FAILS+1)); fi
report reduced-motion "$R" "transitionDuration reduced=${DUR_RM:-?} default=${DUR_DEF:-?}"

# ---- check 3: color scheme (pass: body bg differs + color-scheme adapts) ---
setmedia dark >/dev/null
BG_DARK=$(ev "getComputedStyle(document.body).backgroundColor")
CS=$(ev "getComputedStyle(document.documentElement).colorScheme")
setmedia light >/dev/null
BG_LIGHT=$(ev "getComputedStyle(document.body).backgroundColor")
if [ -n "$BG_DARK" ] && [ -n "$BG_LIGHT" ] && [ "$BG_DARK" != "$BG_LIGHT" ]; then R=Pass; else R=Fail; FAILS=$((FAILS+1)); fi
report color-scheme "$R" "dark=${BG_DARK:-?} light=${BG_LIGHT:-?} colorScheme=${CS:-?}"

# ---- check 4: dialog (pass: bg inert, focus inside, Esc closes + returns) --
ab click "#open-modal" >/dev/null 2>&1; sleep 0.4
SNAP=$(ab snapshot)
ACTIVE=$(ev "document.activeElement.id || document.activeElement.tagName")
if printf '%s' "$SNAP" | grep -qi 'link "settings"'; then INERT=broken; else INERT=inert; fi
ab press Escape >/dev/null 2>&1; sleep 0.3
RET=$(ev "document.activeElement.id || document.activeElement.tagName")
OPEN=$(ev "(()=>{const d=document.querySelector('#dialog');const m=document.querySelector('#modal');return d?d.open:(m?m.classList.contains('open'):'none')})()")
if [ "$INERT" = inert ] && [ "$OPEN" = false ] && [ -n "$ACTIVE" ] && [ "$ACTIVE" != "BODY" ] \
   && [ "$ACTIVE" != "open-modal" ] && [ "$RET" = "open-modal" ]; then R=Pass; else R=Fail; FAILS=$((FAILS+1)); fi
report dialog "$R" "background=${INERT} focus_in_dialog=${ACTIVE:-?} esc_closed=${OPEN:-?} focus_return=${RET:-?}"

setmedia >/dev/null
ab close >/dev/null
exit $((FAILS > 0 ? 1 : 0))
