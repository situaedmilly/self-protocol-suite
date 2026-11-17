# OURSELF Storage Adapter Wire Protocol v1

## Scope

This protocol defines the transport-neutral request and response envelope between OURPROCESSORSELF and a DATASELF storage adapter. It does not grant authority to the caller or admit the receiving adapter.

## Request envelope

Every request carries protocol_version, request_id, nonce, actor_id, reality_id, instance_id, adapter_id, adapter_version, operation, object_key/content_key, expected_preimage or generation when applicable, capability_required, authority_ref, admission_ref, issued_at, expires_at, and request_digest.

Raw credentials and private keys are never embedded in the request envelope. Credentials are resolved by the runtime's secret provider after identity and jurisdiction checks.

## Operations

DESCRIBE, CAPABILITIES, HEALTH, PUT_IMMUTABLE, GET, HEAD, VERIFY, LIST_SNAPSHOT, REPLICATE, RECONTACT, CLOSE.

LIST_SNAPSHOT requires a verifiable snapshot token and bounded namespace. REPLICATE and RECONTACT are separate operations with destination-side evidence. DELETE is not a v1 primitive.

## Response envelope

Every response carries protocol_version, request_id, adapter identity, runtime and host identity, result_state, content_key, byte_count, observed_digest, storage_generation, durability_class, completed_at, receipt_ref, and explicit limitations.

PUT_IMMUTABLE returns PERSISTED only after the adapter's declared flush and read-back. Otherwise it returns a non-success state. GET returns bytes only after digest verification or returns INTEGRITY_MISMATCH. Unsupported capabilities return CAPABILITY_UNAVAILABLE, never silent fallback.

## Idempotency and replay

Nonce and request_id are bound to one operation and preimage. Replays return the original result only when the adapter can prove request identity and result equivalence; otherwise they fail closed. New effects require fresh authority and admission.

## Security

The transport authenticates adapter identity and caller identity independently. Authorization is operation-, object-, namespace-, runtime-, and preimage-scoped. Receipts are signed by the adapter identity but do not self-establish independent witness status.
