# OURSELF Signal Boot

Before reading repository history, source files, or sealed doctrine:

1. Read `.ourself/workflow-signals.v1.json`.
2. Scan the incoming WORKFLOWEXECUTIONSPEECH for exact `*_SIGNAL` markers.
3. Resolve the controlling signal by declared priority.
4. Announce `CONTROLLING_SIGNAL: <name>`.
5. Enforce lower-priority signals as constraints.
6. If no known signal exists, return `UNCLASSIFIED_SIGNAL` and stop before inspection.
7. If an unknown signal exists, return `UNKNOWN_SIGNAL` and fail closed.
8. `STOP_SIGNAL` overrides every other signal.
9. `SEAL_SIGNAL` never implies mutation authority.
10. `FOUNDATION_SIGNAL` never authorizes mutation.

The signal for changing session posture, context budgets, archaeology limits, or execution mode is `OPERATING_SIGNAL`.
