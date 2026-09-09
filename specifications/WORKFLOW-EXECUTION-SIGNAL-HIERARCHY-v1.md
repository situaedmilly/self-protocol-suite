# WORKFLOWEXECUTION_SIGNAL Hierarchy v1 — continuation correction

Founder-authorized correction, 2026-09-09. Supersedes the former mandatory-marker boot contract.

## Scope

Signals classify current user control text. They do not grant authority and are not prerequisites to lawful investigation or already-authorized work. No repository must install this contract merely to participate.

## Optional priority

STOP_SIGNAL > AUTHORITY_SIGNAL > OPERATING_SIGNAL > OBJECTIVE_SIGNAL > INSPECTION_SIGNAL > MUTATION_SIGNAL > VERIFICATION_SIGNAL > SEAL_SIGNAL > FOUNDATION_SIGNAL.

Priority classifies explicit declarations; current user intent and actual effect authorization govern. SEAL_SIGNAL, FOUNDATION_SIGNAL and AUTHORITY_SIGNAL never independently authorize an effect.

## Resolution

- Missing markers return UNCLASSIFIED_SIGNAL and CONTINUE_LAWFUL_WORK.
- Unknown markers return UNKNOWN_SIGNAL with diagnostics and CONTINUE_LAWFUL_WORK. They neither throw a blanket hold nor grant authority.
- WORKFLOWEXECUTION_SIGNAL is the envelope name, not an unknown subordinate signal.
- Supply only current user control text to the resolver. Whole marker lines and SIGNAL: lines are declarations. Prose mentions, fenced examples and blockquotes are not commands. The parser cannot authenticate provenance; callers must not concatenate retrieved source or logs into control input.
- An explicit STOP_SIGNAL retains STOP_SIGNAL_ACTIVE and HONOR_EXPLICIT_USER_STOP_SCOPE, including when unknown labels are also present. Natural-language user stops remain binding even without a marker and must be handled by the caller.
- Actual missing permission defers only the affected effect and its dependencies. Independent lawful work continues.
- Runtime authorization, one-use claims, credentials, protected data, integrity checks, and publication/deployment boundaries remain intact.

## Boot

Situate the actual request, seat, repository, scope, and existing implementation. Read applicable operating instructions. A missing signal configuration, handoff, or historical gate is information to recontact, not a global stop.

## Implementation compatibility

src/workflow-signal.js keeps detectWorkflowSignals and requireWorkflowSignal exports. Both now return optional classification without throwing for missing or unknown labels. Non-string inputs still raise INVALID_PROMPT. Results include authority_granted:false and signal_required:false. Consumers must honor explicit stops at their actual scope, must not treat classification as execution authority, and must recontact this changed contract.

## Evidence ceiling

Updated source establishes a changed contract in custody. It does not establish that existing sessions or deployed consumers reloaded it. Historical commits and sealed specimens retain their original evidence.
