# haku — Claude Code plugin

> **Vendored from [shrwnsan/haku](https://github.com/shrwnsan/haku) @ tag `v0.5.0` — upstream is the source of truth.** This copy is regenerated from the upstream tag, not edited here (LEAN-PLAN §8 D9). License: CC BY-SA 4.0.

A lean plugin for people who'd rather decide well than write fast. An always-on core—8 skills + 5 gate agents—runs the decide → spec → evidence loop; 8 opt-in packs bolt on per role. Skills are namespaced under `haku:` (e.g. `/haku:start`, `/haku:decision-log`).

→ **Full story, philosophy, and pack list: [upstream README](https://github.com/shrwnsan/haku#readme)**

## Quick install

**Claude Desktop app:**

1. Click **Customize** in the left sidebar
2. Click **+** next to "Personal plugins" → choose **Add marketplace**
3. Enter `shrwnsan/haku` and click **Sync**
4. Go to **Plugins → Code** tab, find haku, and click **+** to install it

**Claude Code CLI (terminal):**

```
/plugin marketplace add shrwnsan/haku
/plugin install haku@haku
```

> The `/plugin` commands only work in the terminal CLI — pasting them into the Desktop app chat does nothing.

**Local development:**

```bash
claude --plugin-dir /path/to/haku/plugin
```

## First-time setup

```
/haku:start
```

That's it. The `start` skill orients you, walks through profile setup, and routes you to your first real task.

If you prefer to run setup manually:

```
☐ /haku:user-profile    — who you are (anchor file, read across the core)
☐ /haku:strategy-doc    — what you're building (optional but recommended)
☐ /haku:capture         — get decisions out of your head and into the log
```

## License

[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) — credit required, derivatives stay CC BY-SA 4.0. See [upstream LICENSE](https://github.com/shrwnsan/haku/blob/main/LICENSE).
