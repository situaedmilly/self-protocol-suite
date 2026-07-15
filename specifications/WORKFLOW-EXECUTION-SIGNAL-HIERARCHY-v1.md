# WORKFLOWEXECUTION_SIGNAL Hierarchy v1

## Status

IMPLEMENTED — provider-neutral signal routing contract for bounded OURSELF execution.

## Purpose

`WORKFLOWEXECUTION_SIGNAL` is the root envelope that tells an agent which control signal governs an incoming WORKFLOWEXECUTIONSPEECH before repository inspection begins.

The resolver does not infer authority, mutation scope, or completion from prose. Explicit markers govern. Ambiguous prompts stop.

## Hierarchy

| Priority | Signal | Function |
|---:|---|---|
| 100 | `STOP_SIGNAL` | Halt, refuse continuation, or end the session. Overrides every other signal. |
| 90 | `AUTHORITY_SIGNAL` | Establish or deny authority tokens and execution class. |
| 80 | `OPERATING_SIGNAL` | Set the session posture, budgets, and bounded-execution rules. |
| 70 | `OBJECTIVE_SIGNAL` | Declare the one executable objective for the session. |
| 60 | `INSPECTION_SIGNAL` | Bound files, directories, history, and evidence that may be read. |
| 50 | `MUTATION_SIGNAL` | Bound files, symbols, and state that may be changed. |
| 40 | `VERIFICATION_SIGNAL` | Declare tests, witnesses, and acceptance evidence. |
| 30 | `SEAL_SIGNAL` | Authorize commit, seal, push, promotion, or other terminal persistence. |
| 10 | `FOUNDATION_SIGNAL` | Durable doctrine and architecture. Informational unless paired with another signal. |

## Root envelope

```text
WORKFLOWEXECUTION_SIGNAL
SIGNAL: OPERATING_SIGNAL
REALM: <project>
MODE: BOUNDED_EXECUTION
```

A prompt may contain multiple subordinate signals. The highest-priority explicit signal controls the immediate response. Lower-priority signals remain constraints.

## Resolution law

1. Scan only for exact signal markers from the closed hierarchy.
2. Reject unknown `*_SIGNAL` markers.
3. If no signal marker exists, return `UNCLASSIFIED_SIGNAL` and stop before inspection.
4. If `STOP_SIGNAL` exists, halt regardless of other markers.
5. `SEAL_SIGNAL` never implies `MUTATION_SIGNAL`; commit authority is distinct from implementation authority.
6. `AUTHORITY_SIGNAL` never implies execution.
7. `FOUNDATION_SIGNAL` never authorizes mutation.
8. Every repository must carry `.ourself/workflow-signals.v1.json` declaring this contract and the local project realm.

## Prompt-shift signal

The specific signal for changing how a session operates is:

```text
OPERATING_SIGNAL
```

It governs context budgets, archaeology prevention, execution posture, stop rules, and the READ / MUTATE / VERIFY / REPORT classification.

## Mandatory project boot sequence

```text
1. Read .ourself/workflow-signals.v1.json
2. Resolve explicit signals in the incoming prompt
3. Announce CONTROLLING_SIGNAL
4. Enforce its budgets and prohibitions
5. Stop on UNCLASSIFIED_SIGNAL, UNKNOWN_SIGNAL, or conflicting authority
```

## Terminal states

- `SIGNAL_RESOLVED`
- `UNCLASSIFIED_SIGNAL`
- `UNKNOWN_SIGNAL`
- `SIGNAL_CONFLICT`
- `STOP_SIGNAL_ACTIVE`

## Non-goals

- semantic guessing from unmarked prose
- autonomous authority expansion
- automatic project mutation
- automatic commit or deployment
- replacing SELF IR or human-turn governance
