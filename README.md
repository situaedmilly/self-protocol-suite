# self-protocol-suite

```
class: SYSTEM_LANGUAGE_SPECIFICATION
status: INITIAL_DRAFT
implementation_status: NOT_IMPLEMENTED
deployment_status: NOT_DEPLOYED
promotion_boundary: NOT_CROSSED
```

Provider-neutral computational language specification governing communication, execution semantics, continuity, authority, and evidence for the OURSELF ecosystem.

This repository defines the language. A dependency-free reference implementation of the v0 primitives, grammar, packets, state machine, authority, and evidence contracts exists on branch `worktree-self-protocol-core-v0` (unmerged, not pushed). `main` still contains specification only.

Core v0 module map (`src/`): `primitives.js` (closed noun/verb/packet catalogs, no imports — the dependency-free root), `types.js` (envelope contract), `grammar.js` (instruction parser — parses, never executes), `packets.js` + `continuity.js` (packet constructors/validators), `state-machine.js` (mission lifecycle), `authority.js` (validation only — never mints authority), `evidence.js` (canonical serialization, integrity digests, receipt/provenance validation). Run `npm test` (Node's built-in test runner, zero external dependencies).

Peer repositories:

- `/Users/millysituated/RUORA/projects/agent-bridge` — implements execution (Mission Kernel, OURSELFAGENTBRIDGE kernel)
- `/Users/millysituated/RUORA/systems/ourself-agent-bridge` — OURSELFAGENTBRIDGE control plane
- `/Users/millysituated/RUORA/systems/ourself-cloud-server-network` — coordinates distributed runtimes

See `specifications/SELF-PROTOCOL-SUITE-v0.md` for the current draft specification.
