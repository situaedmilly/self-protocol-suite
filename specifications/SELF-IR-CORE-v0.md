# SELF IR Core v0

## Status

INITIAL_DRAFT — defines the canonical intermediate representation for bounded engineering operations.

## Purpose

SELF IR Core v0 is the simplest executable semantics for expressing an engineering operation — from structured intent through validated authorization to deterministic normalization — without any prose translation, execution dispatch, or tool invocation.

It is the foundation layer of the Hyperbolic Chamber: a space where engineering intent becomes verifiable machine representation before any agent or executor is permitted to act.

## Design Principle

Structured Intent → Compile → Validate → Normalize → STOP

No execution. No dispatch. No tool selection. No prose parsing in v0.

The IR itself must carry enough semantic weight to reject dangerous operations at parse time, not at execution time.

## First-Class Objects

The IR is composed of exactly six semantic objects. They must not be collapsed or inferred.

### 1. Operation

The action being requested.

```
Operation
  verb: IMPLEMENT | [v0 supports IMPLEMENT only]
  mode: SINGLE_SEAM | [v0 supports SINGLE_SEAM only]
```

**v0 Closed Verbs:** IMPLEMENT  
**v0 Closed Modes:** SINGLE_SEAM

Future versions may add verbs (AUDIT, REFACTOR, MIGRATE) and modes (PARALLEL_SEAMS, STAGED).

**Law:** Unknown verbs are rejected at validation time, not inferred.

### 2. Subject

What is being operated upon.

```
Subject
  kind: string (e.g., CanonicalSerializationAdapter)
  target: string (e.g., Kernel | ProtocolCore | CloudNetwork)
  source: string (e.g., ProtocolCore | Kernel | null) [required for IMPLEMENT]
```

**Requirements:**
- kind and target must be non-empty strings.
- target and source must be from a closed whitelist of known systems.
- For IMPLEMENT mode, source must be specified.

**Law:** Unknown targets or sources are rejected. No guessing.

### 3. Authority

Who is authorized to perform this operation and what actions they may take.

```
Authority
  class: BOUNDED_MUTATION | BOUNDED_READ_ONLY | [v0 supports these two]
  allowed: set of actions
  denied: set of actions
```

**v0 Allowed Actions:**
- INSPECT
- MODIFY_AUTHORIZED_FILES
- TEST
- COMMIT
- PUSH_BRANCH
- OPEN_DRAFT_PR

**v0 Denied Actions (hardcoded at parse time):**
- MERGE_MAIN
- DEPLOY
- RATIFY
- PROMOTE

**Laws:**
- An action cannot appear in both allowed and denied.
- Terminal actions (MERGE_MAIN, DEPLOY, RATIFY, PROMOTE) are denied unless explicitly authorized in a separate field (not present in v0).
- Denied actions cannot be requested in continuation.
- Authority is never inferred from scope or operation type.

### 4. Constraints

Boundaries and safety conditions.

```
Constraints
  preserve: set of invariants
  mutation_scope:
    files: set of file paths
  stop_on: set of failure conditions
```

**v0 Preserved Invariants:**
- KernelAPI
- HistoricalHashes
- SealedConsumers
- DependencyPin
- ExternalDependencies

**v0 Stop Conditions:**
- TEST_FAILURE
- SEMANTIC_DIVERGENCE
- UNAUTHORIZED_FILE
- DEPENDENCY_DRIFT
- ASSERTION_FAILURE
- REVERSE_IMPORT_DETECTED

**Laws:**
- mutation_scope must be present for IMPLEMENT operations.
- mutation_scope.files must be a non-empty set.
- File paths must be tracked in the target repository.
- Unknown preserve invariants are rejected.
- Unknown stop conditions are rejected.

### 5. Evidence

Proof obligations that must be satisfied before continuation.

```
Evidence
  required: set of evidence types
  acceptance:
    zero_failures: boolean
    zero_divergences: boolean
```

**v0 Evidence Types:**
- DIFFERENTIAL_TESTS
- FULL_CONSUMER_SUITE
- PROTOCOL_SUITE
- STATIC_DEPENDENCY_CHECK

**Laws:**
- Required evidence must be non-empty for IMPLEMENT operations.
- Acceptance criteria must include zero_failures: true and zero_divergences: true.
- Evidence types are non-negotiable at parse time.

### 6. Continuation

Actions to take on success or failure.

```
Continuation
  on_success: ordered array of actions
  on_failure: ordered array of actions
  terminal_before: set of actions that must not be reached
```

**v0 Terminal Actions:**
- MERGE_MAIN
- DEPLOY
- RATIFY
- PROMOTE

**Laws:**
- on_success may request only non-terminal actions or explicitly authorized terminal actions (not present in v0).
- on_failure must end with STOP (else validation fails).
- Order matters in on_success and on_failure (preserved deterministically).
- No action in on_success or on_failure may appear in denied authority.
- Continuation may not request an action that requires absent authority.

## Deterministic Normalization

normalizeSelfIR produces a canonical form with these guarantees:

**Field Ordering:** Lexicographic within each object (Operation, Subject, Authority, Constraints, Evidence, Continuation).

**Set Ordering:** 
- allowed, denied, preserve, files, required, stop_on, terminal_before are ordered lexicographically.
- No duplicates (sets, not arrays).

**Array Ordering:** 
- on_success and on_failure preserve input order (order is semantically meaningful).

**Immutability:** The normalized object is deeply frozen. No property may be assigned after normalization.

**Non-Inference:** 
- No field is invented.
- No set is widened.
- No authority is assumed.
- Unknown values cause rejection, not inference.

## Provider Neutrality

The IR contains no references to:
- Claude, ChatGPT, OpenAI, Codex, Gemini, or any LLM.
- GitHub, Git, npm, or shell.
- MCP or any agent framework.
- Executor implementation details.

The fixture may name abstract actions (COMMIT, PUSH_BRANCH, OPEN_DRAFT_PR) but not tools that implement them.

## Compile Function Semantics

compileInstructionToIR(instruction) takes a structured object (not prose) and produces a validated, normalized IR.

**v0 Input Shape:**
```
{
  verb: 'IMPLEMENT',
  subject: 'CanonicalSerializationAdapter',
  target: 'Kernel',
  source: 'ProtocolCore',
  authorityClass: 'BOUNDED_MUTATION',
  preserve: ['KernelAPI', 'HistoricalHashes'],
  files: ['persistence/canonical-json.js', 'test/canonical-json.test.js'],
  evidence: ['DIFFERENTIAL_TESTS', 'FULL_CONSUMER_SUITE'],
  deliver: ['COMMIT', 'PUSH_BRANCH', 'OPEN_DRAFT_PR'],
  stopBefore: ['MERGE_MAIN']
}
```

**Process:**
1. Validate all required fields present.
2. Validate verb against OPERATION_VERBS.
3. Validate subject, target, source against closed whitelists.
4. Build Authority from authorityClass.
5. Build Constraints from preserve, files, and derived stop_on.
6. Build Evidence from evidence and derived acceptance criteria.
7. Build Continuation from deliver and stopBefore.
8. Normalize all six objects.
9. Return immutable normalized IR or throw ProtocolIRError.

## Unsupported in v0

- Natural language parsing.
- Autonomous planning.
- Executor selection or dispatch.
- Repository execution (git, npm, GitHub API).
- Tool invocation.
- Retries, scheduling, networking, or persistence.
- Merge, deployment, ratification, or promotion.
- Multiple concurrent operations (parallel seams).
- Conditional logic (if/else in continuation).

## Validation Failures

validateSelfIR must reject with ProtocolIRError (stops execution immediately) when:

- A required object is missing.
- An unknown verb, mode, authority class, action, or preserve invariant appears.
- allowed and denied overlap.
- A continuation action violates denied authority.
- MERGE_MAIN, DEPLOY, RATIFY, or PROMOTE appears in allowed (v0 forbids these).
- A continuation action is not STOP after a failure path.
- mutation_scope is absent for IMPLEMENT.
- evidence.required is empty.
- An unknown top-level field appears.
- A file path in mutation_scope is not tracked.

## Chamber Law

This IR is the first artifact produced inside the Hyperbolic Chamber.

It is designed so that future adoption seams can be compiled from this structure instead of from prose English.

The compilation itself is deterministic, not probabilistic.

The validation is complete, not probabilistic.

The normalization is idempotent and immutable.

This is the foundation for the compiler that will generate adoption work.
