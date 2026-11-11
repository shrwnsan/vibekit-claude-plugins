#!/usr/bin/env python3
"""Preserve the agents-hub's local `metadata:` frontmatter across skill syncs.

The sync loop wholesale-replaces skills/<name>/ (rm -rf + cp -r), which
destroys locally-owned frontmatter: metadata.version (the hub's package
lineage, agents#104), upstream_version pins, and hardening notes. This
script snapshots each synced skill's metadata block before the copy and
re-applies it after. Upstream metadata keys are ignored: packaging
metadata is hub-local state, and upstreams that ship their own `version`
keys (e.g. nothing-design's dropped `version: 3.0.0`) must not overwrite
the hub's numbering.

Modes:
  snapshot <skill-dir> <snapshot-file>   record the metadata block, if any
  restore  <skill-dir> <snapshot-file>   re-apply it onto the new SKILL.md

Text-level, not YAML-level: the block is the lines from a top-level
`metadata:` line until the next top-level key or frontmatter close, so
lists and quoted scalars survive verbatim. Both modes fail soft — a
missing file, empty snapshot, or no frontmatter is a no-op with an
explanatory line; the workflow calls both with `|| true`.

Self-test: --self-test runs four scenarios (existing block survives;
block inserted into metadata-less upstream; upstream metadata never
overwrites the local block; missing snapshot is a no-op) in a temp dir.
"""

import sys
import tempfile
from pathlib import Path


def extract_metadata_block(text: str) -> list[str] | None:
    """Return the top-level `metadata:` block lines, or None if absent/malformed."""
    lines = text.splitlines()
    try:
        close = lines.index("---", 1)
    except ValueError:
        return None
    start = None
    for i in range(1, close):
        if lines[i] == "metadata:":
            start = i
            break
    if start is None:
        return None
    end = close
    for i in range(start + 1, close):
        if lines[i] and not lines[i][0].isspace() and lines[i] != "metadata:":
            end = i
            break
    return lines[start:end]


def restore(skill_dir: Path, snapshot_file: Path) -> int:
    skill_md = skill_dir / "SKILL.md"
    if not snapshot_file.exists() or not skill_md.exists():
        print(f"preserve-metadata: no snapshot or no SKILL.md in {skill_dir}, skip")
        return 0
    block = snapshot_file.read_text().splitlines()
    if not block:
        print(f"preserve-metadata: empty snapshot for {skill_dir}, skip")
        return 0
    text = skill_md.read_text()
    lines = text.splitlines()
    try:
        close = lines.index("---", 1)
    except ValueError:
        print(f"preserve-metadata: no frontmatter in {skill_dir}/SKILL.md, skip")
        return 0
    existing = None
    for i in range(1, close):
        if lines[i] == "metadata:":
            existing = i
            break
    if existing is not None:
        end = close
        for i in range(existing + 1, close):
            if lines[i] and not lines[i][0].isspace():
                end = i
                break
        lines[existing:end] = block
        print(f"preserve-metadata: replaced upstream metadata in {skill_dir}/SKILL.md")
    else:
        lines[close:close] = block
        print(f"preserve-metadata: re-applied local metadata to {skill_dir}/SKILL.md")
    skill_md.write_text("\n".join(lines) + ("\n" if text.endswith("\n") else ""))
    return 0


def self_test() -> int:
    failures = []
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)

        def scenario(name: str, old_fm: str, new_fm: str, want: str) -> None:
            d = root / name
            d.mkdir()
            snap = d / "snap.txt"
            skill = d / "SKILL.md"
            skill.write_text(old_fm)
            extract = extract_metadata_block(old_fm)
            snap.write_text("\n".join(extract) if extract else "")
            skill.write_text(new_fm)  # simulate the wholesale upstream replace
            restore(d, snap)
            got = skill.read_text()
            (failures if got != want else []).append(name) if got != want else None
            print(f"{'PASS' if got == want else 'FAIL'}  {name}")
            if got != want:
                print(f"  want: {want!r}\n  got:  {got!r}")

        scenario(
            "existing-block-survives-wholesale",
            "---\nname: x\nmetadata:\n  version: \"1.0.0\"\n---\nbody\n",
            "---\nname: x\n---\nnew body\n",
            "---\nname: x\nmetadata:\n  version: \"1.0.0\"\n---\nnew body\n",
        )
        scenario(
            "block-inserted-into-metadataless-upstream",
            "---\nname: x\nlicense: MIT\nmetadata:\n  version: \"2.1.0\"\n  hardening:\n    - a\n---\nbody\n",
            "---\nname: x\nlicense: MIT\n---\nnew body\n",
            "---\nname: x\nlicense: MIT\nmetadata:\n  version: \"2.1.0\"\n  hardening:\n    - a\n---\nnew body\n",
        )
        scenario(
            "upstream-metadata-never-overwrites-local",
            "---\nname: x\nmetadata:\n  version: \"1.0.0\"\n---\nbody\n",
            "---\nname: x\nmetadata:\n  version: \"9.9.9\"\n---\nnew body\n",
            "---\nname: x\nmetadata:\n  version: \"1.0.0\"\n---\nnew body\n",
        )
        empty = root / "empty"
        empty.mkdir()
        (empty / "SKILL.md").write_text("---\nname: y\n---\nb\n")
        r = restore(empty, root / "does-not-exist.txt")
        ok = r == 0 and (empty / "SKILL.md").read_text() == "---\nname: y\n---\nb\n"
        print(f"{'PASS' if ok else 'FAIL'}  missing-snapshot-noop")
        if not ok:
            failures.append("missing-snapshot-noop")
    print("self-test:", "PASS" if not failures else f"FAIL {failures}")
    return 0 if not failures else 1


def main() -> int:
    if "--self-test" in sys.argv:
        return self_test()
    if len(sys.argv) != 3 or sys.argv[1] not in ("snapshot", "restore"):
        print(__doc__, file=sys.stderr)
        return 2
    mode, skill_dir, snapshot_file = sys.argv[1], Path(sys.argv[2]), Path(sys.argv[3])
    if mode == "snapshot":
        skill_md = skill_dir / "SKILL.md"
        block = extract_metadata_block(skill_md.read_text()) if skill_md.exists() else None
        snapshot_file.write_text("\n".join(block) if block else "")
        print(f"preserve-metadata: snapshot {'found' if block else 'empty'} for {skill_dir}")
        return 0
    return restore(skill_dir, snapshot_file)


if __name__ == "__main__":
    sys.exit(main())
