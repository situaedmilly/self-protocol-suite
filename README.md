# self-protocol-suite

```
class: SYSTEM_LANGUAGE_SPECIFICATION
status: INITIAL_DRAFT
implementation_status: NOT_IMPLEMENTED
deployment_status: NOT_DEPLOYED
promotion_boundary: NOT_CROSSED
```

Provider-neutral computational language specification governing communication, execution semantics, continuity, authority, and evidence for the OURSELF ecosystem.

This repository defines the SELF Protocol language and includes a dependency-free reference implementation of the v0 primitives, grammar, packets, state machine, authority, evidence, and continuity contracts under `src/`.

Core v0 module map (`src/`): `primitives.js` (closed noun/verb/packet catalogs, no imports — the dependency-free root), `types.js` (envelope contract), `grammar.js` (instruction parser — parses, never executes), `packets.js` + `continuity.js` (packet constructors/validators), `state-machine.js` (mission lifecycle), `authority.js` (validation only — never mints authority), `evidence.js` (canonical serialization, integrity digests, receipt/provenance validation). Run `npm test` (Node's built-in test runner, zero external dependencies).

Peer repositories:

- `/Users/millysituated/RUORA/projects/agent-bridge` — implements execution (Mission Kernel, OURSELFAGENTBRIDGE kernel)
- `/Users/millysituated/RUORA/systems/ourself-agent-bridge` — OURSELFAGENTBRIDGE control plane
- `/Users/millysituated/RUORA/systems/ourself-cloud-server-network` — coordinates distributed runtimes

See `specifications/SELF-PROTOCOL-SUITE-v0.md` for the current draft specification.

## SELF IR Core v0

The SELF Intermediate Representation is the canonical machine semantics for expressing bounded engineering operations without prose translation.

### Purpose

SELF IR Core v0 allows structured intent to be compiled, validated, and normalized into unambiguous machine representation before any executor or tool is invoked.

### Usage

```js
import { compileInstructionToIR, validateSelfIR } from 'self-protocol-suite';

const instruction = {
  verb: 'IMPLEMENT',
  subject: 'CanonicalSerializationAdapter',
  target: 'Kernel',
  source: 'ProtocolCore',
  authorityClass: 'BOUNDED_MUTATION',
  preserve: ['KernelAPI', 'HistoricalHashes'],
  files: ['persistence/canonical-json.js'],
  evidence: ['DIFFERENTIAL_TESTS', 'FULL_CONSUMER_SUITE'],
  deliver: ['COMMIT', 'PUSH_BRANCH', 'OPEN_DRAFT_PR'],
  stopBefore: ['MERGE_MAIN']
};

const ir = compileInstructionToIR(instruction);
// ir is now a validated, normalized, immutable SELF operation
```

### API

- `validateSelfIR(obj)` — Validate a complete IR object. Throws ProtocolIRError on failure.
- `normalizeSelfIR(obj)` — Normalize an already-valid IR to canonical form. Returns immutable object.
- `compileInstructionToIR(instruction)` — Compile a structured instruction object into validated, normalized IR.

### Specification

See `specifications/SELF-IR-CORE-v0.md` for the complete formal specification.

### Chamber Law

SELF IR Core v0 is the first artifact produced inside the Hyperbolic Chamber — a space where engineering intent becomes machine semantics before execution.

Future adoption seams will be compiled from this IR instead of from prose English.
