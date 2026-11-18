# mwg-gate fixture

Four-defect fixture for the prd-012 validation gate (`docs/plans/prd-012-modern-web-guidance.md`). One seeded defect per Modern Web Guidance check family, plus a repaired twin so every check is validated in both directions:

| Check | Seeded defect (index.html) | Fix (fixed.html) |
|---|---|---|
| `cls` | Banner image injected 250 ms after load with no reserved space, pushing a tall feed section down | Image in markup with explicit `width`/`height` + `aspect-ratio` reserved slot |
| `reduced-motion` | 0.3 s transform transition, no `prefers-reduced-motion` arm (identical durations under both preferences) | Reduced-motion arm keeps a 0.1 s fade, drops the scale |
| `color-scheme` | Dark arm tints only the `<h1>`; body stays white, `color-scheme: light only` | Full dark theme + `color-scheme: light dark` meta |
| `dialog` | Hand-rolled div modal: background links stay in the a11y tree and clickable, focus never enters, Esc does nothing | Native `<dialog>` + `showModal()`, `autofocus` Cancel, Esc/focus-return for free |

## Run

```bash
./build-inline.sh        # inline banner.svg into index.inline.html / fixed.inline.html
./run-gate-checks.sh             # defect page: expect 4 Fails, exit 1
./run-gate-checks.sh fixed       # fixed page:  expect 4 Passes, exit 0
./run-gate-checks.sh --json      # machine-readable lines
```

The runner needs `agent-browser` and `python3` on PATH. Pages load as `data:` URLs (no server), so it works in network-isolated browser environments; set `MWG_URL` to point the checks at a live page instead. Without `agent-browser` it reports the step-down and exits 2 — it never claims a pass it cannot observe.

## Baseline readout (agent-browser 0.39.1, headless Chromium, 800x600)

```
$ ./run-gate-checks.sh
cls             Fail        cls=0.15 (threshold 0.1; entries per shift in vitals --json)
reduced-motion  Fail        transitionDuration reduced=0.3s default=0.3s
color-scheme    Fail        dark=rgb(255, 255, 255) light=rgb(255, 255, 255) colorScheme=light only
dialog          Fail        background=broken focus_in_dialog=open-modal esc_closed=true focus_return=open-modal

$ ./run-gate-checks.sh fixed
cls             Pass        cls=0 (threshold 0.1; entries per shift in vitals --json)
reduced-motion  Pass        transitionDuration reduced=0.1s default=0.3s
color-scheme    Pass        dark=rgb(11, 18, 32) light=rgb(255, 255, 255) colorScheme=light dark
dialog          Pass        background=inert focus_in_dialog=cancel-delete esc_closed=false focus_return=open-modal
```

Gate harness note: the fixture pages are the *scoring instrument* for the 2x2 arms, not the treatment. The skill under test is never resident in the harness; arms are scored by whether their output changes these checks, verified by this runner, not by the agent's own report.

## Served-mode parity

The same checks were designed against upstream's dev-server workflow (`vitals http://localhost:3000/...`). In environments where the browser shares a network namespace with the runner, `MWG_URL=http://localhost:8123/index.html ./run-gate-checks.sh` runs the identical checks against a served copy; the data:-URL mode exists because managed browsers here are network-isolated. If you get `net::ERR_CONNECTION_REFUSED` on localhost with a healthy server, your browser is namespace-isolated too — use the default mode.
