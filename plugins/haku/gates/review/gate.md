# gate: review
trigger:   implementation is complete and about to merge — fires on the changeset, before the merge lands
agent:     the-rfc-reviewer
inputs:    the spec under review, the changeset (diff or summary), eval results for the acceptance criteria, the wins-log entry recording the outcome
pass:      the implementation matches strategy-doc constraints (track, personas, counter-metrics); eval cases cover every acceptance criterion; outcome evidence is referenced (wins-log entry or a named reason none exists yet); blocker findings from the review are resolved or explicitly waived
rounds:    2
exit:      decision-log entry updated with the gate verdict — per-criterion true/false + notes
failure:   merge-with-exception requires human sign-off recorded in the decision-log entry

Judge discipline: verdicts are per-criterion binary with notes. Log the judge disagreement rate alongside the verdict — it is the gate's known error rate, not something to hide.
