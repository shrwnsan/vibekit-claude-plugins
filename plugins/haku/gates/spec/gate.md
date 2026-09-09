# gate: spec
trigger:   a spec is drafted and about to start build work — fires after the-spec-writer, before implementation
agent:     the-red-teamer
inputs:    the drafted spec (the-spec-writer output), strategy/<area-slug>.md for the area, the decision-log entry, the spec's declared FLAG:/SHADOW: tokens
pass:      every acceptance criterion is testable as written; failure modes are listed with detection and blast radius; every FLAG:/SHADOW: token in the implementation appears in the spec; adversarial cases (injection, OOD input, cost runaway) are addressed for any AI component
rounds:    2
exit:      decision-log entry updated with the gate verdict and the final token list — per-criterion true/false + notes
failure:   ship-without-gate requires human sign-off recorded in the decision-log entry

Judge discipline: verdicts are per-criterion binary with notes. Log the judge disagreement rate alongside the verdict — it is the gate's known error rate, not something to hide.
