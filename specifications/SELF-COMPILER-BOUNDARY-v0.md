```
class: SYSTEM_LANGUAGE_SPECIFICATION
status: INITIAL_DRAFT
implementation_status: IMPLEMENTED
deployment_status: NOT_DEPLOYED
promotion_boundary: NOT_CROSSED
```

# SELF Compiler Boundary v0

## Identity

The SELF Compiler Boundary is the first constitutional compiler in the OURSELF
ecosystem: the seam that turns validated SELF IR into a deterministic,
executor-neutral execution plan — and stops.

## Purpose

An implementation may consume constitutional meaning. It may never become the
source of constitutional meaning. The compiler boundary makes that distinction
mechanical rather than aspirational: it is a pure function from IR to plan,
with no executor, dispatcher, tool invocation, or repository mutation reachable
from within it.

```
Structured Instruction
        ↓
SELF IR
        ↓
Execution Plan
        ↓
Executor Contract
        ↓ STOP
```

## Constitutional Layers

**Protocol layer** (`src/ir.js`, pre-existing) owns stable meanings: Operation,
Subject, Authority, Constraints, Evidence, Continuation.

**IR layer** (`src/ir.js`, pre-existing) owns the canonical representation:
`SELFOperationIR`, produced by `compileInstructionToIR` and proven by
`validateSelfIR` / `normalizeSelfIR`.

**Compiler layer** (`src/compiler.js`) owns one pure transformation: validated
IR in, a deterministic execution plan out. `compileIRToExecutionPlan(ir)` is
the entire surface.

**Executor contract** (`src/executor-contract.js`) owns the abstract boundary
an executor must honor. It defines the contract. It does not implement one.

Adapters — translating an execution plan into a concrete implementation
action — are declared as a future seam by this contract and are not
implemented under this authorization.

## Execution Plan

```
plan_type: SELF_EXECUTION_PLAN
plan_version: v0
identity:
  operation_id: <deterministic content hash of canonical IR>
  correlation_id: <deterministic content hash derived from operation_id>
operation:
  verb: <IR Operation.verb>
  subject: <IR Subject.kind>
authority:
  allowed: <subset of IR Authority.allowed, never a superset>
  denied: <IR Authority.denied, unioned with the fixed terminal-action floor>
  ceiling: <IR Authority.class>
scope:
  resources: <exactly IR Constraints.mutation_scope.files>
  mutation_targets: <subset of scope.resources>
phases:
  - id: <phase-N>
    operation: <one of the closed phase vocabulary>
    depends_on: <ids of earlier phases only — no forward reference>
    evidence_required: <non-empty only on the TEST phase>
    stop_conditions: <IR Constraints.stop_on>
evidence:
  requirements: <exactly IR Evidence.required — nothing dropped>
  acceptance: <IR Evidence.acceptance>
continuation:
  success: <IR Continuation.on_success, order preserved>
  failure: <IR Continuation.on_failure, must end in STOP>
  terminal_before: <IR Continuation.terminal_before, unioned with the terminal-action floor>
```

The plan contains no provider, model, API, shell, repository host, or
operating-system implementation detail. Every action is drawn from a closed
vocabulary (`PLAN_PHASE_OPERATIONS`); nothing outside it can appear in an
executable phase.

## Executor Contract

```
executor_contract:
  executor_contract_version: v0
  accepts:
    - SELF_EXECUTION_PLAN
  returns:
    - EXECUTION_RECEIPT
    - EVIDENCE_PACKET
  must:
    - preserve_operation_identity
    - preserve_authority_ceiling
    - remain_within_scope
    - emit_required_evidence
    - terminate_on_stop_condition
  must_not:
    - infer_authority
    - widen_scope
    - rewrite_plan_semantics
    - claim_semantic_success_from_process_success
    - continue_after_terminal_boundary
```

`validateExecutorContract(contract)` proves a declared contract carries every
required obligation and prohibition, with no overlap between them, and
accepts/returns nothing beyond the closed set above.

## Compiler Laws

**Determinism.** The same canonical IR compiles to the same canonical
execution plan, always. `compileIRToExecutionPlan` reads only its `ir`
argument — no clock, randomness, environment variable, filesystem state, or
network state may influence the result. Identity fields are derived by
hashing the canonical IR content itself, not by generating anything.

**Authority preservation.** `plan.authority.allowed ⊆ ir.Authority.allowed`.
The compiler may narrow authority; it can never widen it. `plan.authority.denied`
only ever grows (union with the fixed terminal-action floor), which narrows
the plan further rather than widening it.

**Scope preservation.** `plan.scope.resources` is exactly
`ir.Constraints.mutation_scope.files` — no new resource appears during
compilation. `plan.scope.mutation_targets ⊆ plan.scope.resources`.

**Evidence preservation.** Every entry in `ir.Evidence.required` appears in
`plan.evidence.requirements`. The compiler may add stricter acceptance
criteria; it may not remove an existing requirement.

**Continuation preservation.** `ir.Continuation.on_success` survives into
`plan.continuation.success` in the same order. A denied or terminal action
can never appear in an executable phase, and nothing may follow a `STOP`
marker in a continuation array.

**Provider neutrality.** `src/compiler.js`, `src/execution-plan.js`,
`src/executor-contract.js`, and `src/index.js` contain zero references to
Claude, Anthropic, OpenAI, ChatGPT, Codex, Gemini, GitHub, GitLab, MCP, npm,
shell, bash, REST, or HTTP. Abstract action vocabulary (`COMMIT`,
`PUSH_BRANCH`, `OPEN_DRAFT_PR`, ...) remains because it names intent, not
implementation.

## Chamber Fixture

The command-route persistence guard seam — already proven in the kernel
repository — is compiled through `compileInstructionToIR` into IR, then
through `compileIRToExecutionPlan` into a deterministic six-phase execution
plan (`INSPECT → MODIFY_AUTHORIZED_FILES → TEST → COMMIT → PUSH_BRANCH →
OPEN_DRAFT_PR`), each phase depending on exactly the one before it. The
compiler never executes this plan.

## Receipt Verification Boundary

`validateExecutionReceiptAgainstPlan(plan, receipt)` proves only:

- the executor reported execution under the expected operation identity,
- within the plan's declared scope,
- with a reference for every required evidence type.

It returns `{ receipt_accepted, operation_identity_preserved, scope_conformant,
evidence_references_present }` — deliberately no field asserting semantic
correctness. **Execution receipt accepted ≠ outcome semantically verified.**
An executor cannot smuggle a correctness claim through this boundary because
the receipt schema has no field for one; unrecognized fields are refused.

## Explicitly Unsupported

```
unsupported:
  - natural_language_parsing
  - workflow_search
  - autonomous_planning
  - provider_selection
  - tool_dispatch
  - command_execution
  - filesystem_mutation
  - networking
  - retries
  - scheduling
  - merge
  - deployment
  - ratification
  - promotion
```

## Chamber Law

```
Constitution defines meaning
        ↓
IR captures lawful intent
        ↓
Compiler produces constrained plans
        ↓
Adapters translate
        ↓
Executors remain replaceable
```

An implementation may consume constitutional meaning, but it may never
become the source of constitutional meaning.
