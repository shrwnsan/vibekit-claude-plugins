#!/usr/bin/env bash
# Builds index.inline.html and fixed.inline.html from index.html / fixed.html
# by inlining banner.svg as a data URI. The runner loads the inline pages as
# data: URLs so no server is required (works in network-isolated browsers).
set -eu
cd "$(dirname "$0")"
command -v python3 >/dev/null || { echo "python3 required" >&2; exit 2; }
python3 - <<'EOF'
import base64, pathlib
uri = "data:image/svg+xml;base64," + base64.b64encode(pathlib.Path("banner.svg").read_bytes()).decode()
for src, out in (("index.html", "index.inline.html"), ("fixed.html", "fixed.inline.html")):
    t = pathlib.Path(src).read_text()
    t = t.replace("src='banner.svg'", f"src='{uri}'").replace('src="banner.svg"', f'src="{uri}"')
    pathlib.Path(out).write_text(t)
    print("built", out)
EOF
