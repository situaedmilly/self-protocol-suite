# SELF Protocol Suite — v0

```
class: SPECIFICATION
status: INITIAL_DRAFT
authority: FOUNDER_AUTHORIZED_FOR_DRAFTING
ratification: NOT_GRANTED
implementation_status: NOT_IMPLEMENTED
```

Drafting authority does not constitute ratification. Nothing in this document should be read as implemented, deployed, ratified, promoted, production-ready, or empirically proven. It defines a language, not a running system.

---

## 1. Purpose

The SELF Protocol Suite is a provider-neutral computational language specification governing communication, execution semantics, continuity, authority, and evidence for the OURSELF ecosystem.

It is not a runtime, a network implementation, or an execution engine. It is the constitution of communication: the vocabulary, grammar, and semantics that every runtime, cloud coordinator, and provider must speak in order to interoperate without redefining meaning independently.

Every other OURSELF repository *implements* this language. This repository only *defines* it.

---

## 2. Design Principles

- **Provider Neutrality** — no primitive names or implies a specific vendor, model, or platform.
- **Runtime Independence** — the language remains valid whether the executor is local, edge, cloud, or a specific vendor runtime.
- **Deterministic Semantics** — grammar and state transitions must be mechanically evaluable, not left to model interpretation.
- **Authority Preservation** — no primitive, verb, or grammar construction may itself grant, escalate, or waive authority.
- **Continuity** — every primitive that represents in-flight work must be resumable and recoverable, not only completable.
- **Auditability** — every execution-shaped sentence must be traceable to evidence; silent, unwitnessed state changes are not expressible in this language.

---

## 3. Protocol Suite Architecture

```
Vocabulary
   ↓
Grammar
   ↓
Type System
   ↓
Packets
   ↓
Execution
   ↓
Evidence
   ↓
Continuity
```

Each layer depends only on the layer(s) above it and exposes a stable interface downward. A layer may not reach past its neighbor — Execution semantics may not redefine Grammar, and Continuity may not redefine Evidence.

---

## 4. Primitive Catalog

The closed set of concepts every higher construction is built from:

- Identity
- Mission
- Capability
- Runtime
- Executor
- Authority
- Evidence
- Receipt
- Ledger
- Artifact
- Memory
- Lease
- Interruption
- Recovery

No other primitive may be introduced in v0. New primitives require a version increment and their own Founder authorization, not silent extension of this document.

---

## 5. Vocabulary

Canonical nouns (each maps to exactly one primitive in §4):

| Noun | Primitive | Meaning |
|---|---|---|
| `Mission` | Mission | A durable unit of intent with lifecycle state. |
| `Runtime` | Runtime | A computational executor's governed identity. |
| `Executor` | Executor | A specific bound instance of a Runtime performing work. |
| `Capability` | Capability | A named ability a Mission may request, independent of provider. |
| `Identity` | Identity | The attested, non-sovereign identity of a Runtime or Executor. |
| `Authority` | Authority | A bounded grant permitting specific action. |
| `Evidence` | Evidence | An observation supporting or refuting a claimed outcome. |
| `Receipt` | Receipt | A structured record that an execution attempt occurred. |
| `Ledger` | Ledger | An append-only, integrity-hashed sequence of Receipts and Evidence. |
| `Artifact` | Artifact | A produced output bound to a Mission and Receipt. |
| `Memory` | Memory | Scoped state retained across an interruption. |
| `Lease` | Lease | A time-bounded, revocable claim on a unit of work. |
| `Interruption` | Interruption | An explicit, recorded halt of in-flight work. |
| `Recovery` | Recovery | A governed procedure for resuming after Interruption. |

Vocabulary is closed in v0: no noun may be used in a sentence (§7) unless it names a primitive above.

---

## 6. Verb Catalog

The closed set of actions a sentence may perform:

- `DECLARE`
- `REQUEST`
- `LEASE`
- `EXECUTE`
- `VERIFY`
- `COMMIT`
- `EMIT`
- `TRANSFER`
- `SEAL`
- `REVOKE`
- `ESCALATE`
- `RESUME`

Each verb operates on exactly one primitive class per use (e.g. `LEASE` operates on `Executor`/`Lease`, never on `Authority`). `ESCALATE` and `REVOKE` are Authority-only verbs and may never be inferred from any other verb's completion.

---

## 7. Grammar

Grammar describes legal sentence *composition* — which verb may act on which noun, and in what sequence — not textual syntax or serialization format (that is a downstream implementation concern, out of scope for v0; see §16).

A minimal legal sentence sequence:

```
DECLARE Mission
REQUEST Capability
LEASE Runtime
EXECUTE Mission
VERIFY Receipt
COMMIT Ledger
```

Grammar law:

- A `Mission` must be `DECLARE`d before any `Capability` may be `REQUEST`ed against it.
- `EXECUTE` may only follow a successful `LEASE`; no `Executor` may `EXECUTE` unleased work.
- `VERIFY` may only act on a `Receipt` that already exists; there is no sentence that verifies an unexecuted Mission.
- `COMMIT` is the only verb that may write to `Ledger`.
- `SEAL` terminates a Mission's mutable lifecycle; no further `EXECUTE` or `TRANSFER` may target a `SEAL`ed Mission.
- `ESCALATE` and `REVOKE` may act only on `Authority`, never on `Mission`, `Capability`, or `Receipt` directly.
- `RESUME` may only follow a recorded `Interruption`; it may not be composed against a Mission with no Interruption on its Ledger.

The grammar itself is meant to be executable — a conforming implementation should be able to mechanically reject an illegal sentence sequence without model judgment.

---

## 8. Type System

Four type classes:

- **Primitive types** — the fourteen entries in §4, atomic and non-decomposable within v0.
- **Composite types** — structures built from more than one primitive (e.g. a `Mission` composite includes `Identity`, `Authority`, and zero or more `Artifact` references).
- **Immutable types** — once committed to `Ledger`, a value's fields never change; corrections are new Ledger entries, never edits (`Receipt`, `Ledger` entries, sealed `Mission` state).
- **Authority-bearing types** — types whose presence changes what is legally executable (`Authority`, `Lease`); these may never be constructed by an Executor for itself.
- **Evidence-bearing types** — types whose value is a claim requiring independent support (`Evidence`, `Receipt`); these must reference the Ledger entry that supports them.

A type may belong to more than one non-primitive class (e.g. `Receipt` is both Immutable and Evidence-bearing).

---

## 9. Packet Definitions

Packet shapes carried between Runtimes. Field-level schemas are deferred to an implementation repository (§16); this section fixes only the required conceptual fields.

- **Mission Packet** — mission identity, sealed intent, constraints, authority reference, lifecycle state.
- **Capability Packet** — requested capability identifier, input/output contract reference, eligible-runtime constraints.
- **Receipt Packet** — mission reference, executor reference, capability reference, observed result, integrity reference.
- **Evidence Packet** — receipt reference, independent observation, verification verdict.
- **Lease Packet** — leased unit of work reference, executor reference, expiry, revocation condition.
- **Recovery Packet** — mission reference, last verified event, interruption reason, safe resume point.

Every packet class must be traceable to exactly one primitive in §4 as its subject.

---

## 10. Execution Semantics

State transitions (illustrative, not exhaustive):

```
DECLARED → ORIENTED → RUNNING → COMPLETE → SEALED
```

```
RUNNING → INTERRUPTED → REORIENTING → RESUMED
```

Lifecycle law:

- A Mission's state transitions are append-only; a prior state is never overwritten, only superseded by a new recorded transition.
- Continuation after Interruption must originate from a Recovery Packet, never from an Executor's own unverified memory of prior state.
- Executor replacement (one Executor's Lease expiring or being revoked, and a different Executor acquiring a new Lease on the same unit of work) must not itself constitute a new Mission — Mission identity survives Executor identity.

---

## 11. Authority Model

Authority sources, ordered by who may hold or exercise Authority:

- Human
- Runtime
- Executor
- Capability
- Mission
- Cloud

Law: **none may elevate itself.** No entity in this list may construct, expand, or infer its own Authority from its own prior actions, confidence, or success. Authority is only ever `REQUEST`ed and separately granted by an entity already holding sufficient Authority to grant it — ultimately grounded in Human authority. `ESCALATE` is a request verb, not a self-granting verb.

---

## 12. Continuity Semantics

- **Resume** — reconstruct a Mission's legal next state strictly from its Ledger and a Recovery Packet.
- **Pause** — an explicit, recorded, non-error halt distinct from Interruption; a Mission may be `PAUSE`d by Authority without any failure having occurred.
- **Transfer** — reassignment of a Lease or Executor binding without altering Mission identity or sealed intent.
- **Recovery** — the governed procedure that converts an Interruption into either Resumed or Human Review; recovery may never silently discard unverified actions, only mark them explicitly unverified.
- **Ledger replay** — deterministic reconstruction of current Mission state by replaying all prior Ledger entries in order; two independent replays of the same Ledger must produce identical resulting state.
- **Restart** — creation of a new Mission that references a prior sealed or abandoned Mission as ancestry; a Restart is not a Resume and must not reuse the prior Mission's identity.

---

## 13. Evidence Semantics

- **Verification** — the act of independently checking a Receipt's claimed result against a fresh observation.
- **Receipts** — proof that an execution attempt occurred; existence of a Receipt does not by itself prove semantic correctness (only that an attempt was witnessed).
- **Checksums** — deterministic integrity values over packet or artifact content, used to detect any mutation between production and consumption.
- **Canonical hashes** — the specific, versioned hashing method a given packet or artifact class commits to, so that independent verifiers reproduce identical values.
- **Witnesses** — an independently collected observation of the same target an Executor acted on, used as Verification input; a Witness must not be produced by the same Executor that produced the Receipt it verifies.

---

## 14. Protocol Layer Mapping

| Layer | Responsibility |
|---|---|
| Vocabulary | Meaning |
| Grammar | Composition |
| Types | Validity |
| Packets | Transport |
| Runtime | Execution |
| Evidence | Verification |
| Continuity | Persistence |

Each layer's responsibility is exclusive — Grammar does not carry Transport concerns, and Runtime does not redefine Meaning.

---

## 15. Relationship to Peer Repositories

```
SELF Protocol Suite        ← defines the language (this repository)
        ↓
OURSELFROOT
        ↓
OURSELFAGENTBRIDGE          ← implements execution
        ↓
OURSELFCLOUDSERVERNETWORK   ← coordinates distributed runtimes
        ↓
Platform Runtimes
        ↓
Providers
```

This repository defines no execution behavior itself. `OURSELFAGENTBRIDGE`'s kernel and control plane, and `OURSELFCLOUDSERVERNETWORK`'s registries and routing, are implementations of this language — this document does not require, reference, or depend on either repository's existing code, and no code in either repository is asserted to conform to this specification as of v0 `INITIAL_DRAFT`. Conformance is a future, separately authorized concern.

---

## 16. Deferred Scope

Explicitly excluded from v0 (`status: DEFERRED`, `implementation_status: OUT_OF_SCOPE_FOR_V0`):

- Apple Runtime
- Android Runtime
- Windows Runtime
- Linux Runtime
- Browser Runtime
- MCP bindings
- Network implementation
- Compiler
- DSL (concrete textual syntax/serialization)
- IDE integration

---

## Status

```
class: SPECIFICATION
status: INITIAL_DRAFT
implementation_status: NOT_IMPLEMENTED
deployment_status: NOT_DEPLOYED
ratification: NOT_GRANTED
promotion_boundary: NOT_CROSSED
```

This document defines a language only. It does not authorize implementation, deployment, ratification, or promotion of any component, primitive, or runtime described above.
