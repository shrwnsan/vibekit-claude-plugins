# gate: intent
trigger:   an ask is captured and about to become work — fires after capture, before any spec work begins
agent:     the-reducer
inputs:    the captured ask (capture output or verbatim user statement), the decision-log entry opened for the call, profile.md for context
pass:      intent is ≤ 50 words; at least 1 measurable acceptance criterion exists; every out-of-scope item is explicitly deferred to a named future intent; no "AI problem" left unchallenged where a UI or data fix fits
rounds:    2
exit:      decision-log entry updated with the gate verdict — per-criterion true/false + notes, never a holistic score
failure:   proceed-with-exception requires human sign-off recorded in the decision-log entry

Judge discipline: verdicts are per-criterion binary with notes. Log the judge disagreement rate alongside the verdict — it is the gate's known error rate, not something to hide.
