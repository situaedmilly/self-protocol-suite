// SELF Protocol Core v0 — packet constructors and validators for the
// non-continuity output types. Lease/Interruption/Recovery/Handoff live in
// continuity.js. Every constructed packet is frozen (immutable type law).

import { generateId, computeIntegrityDigest } from './evidence.js';
import { validateEnvelope, validatePayload, PROTOCOL_VERSION } from './types.js';
import { isPacketType } from './primitives.js';
import { ProtocolTypeError } from './errors.js';

// A provenance chain is empty at packet genesis and only accumulates as a
// packet crosses boundaries — every packet type therefore treats
// `provenance` as nullable by default. Callers extend `nullableEnvelope`
// for any further type-specific exemptions (e.g. a root authority grant
// has no prior authority_envelope to reference).
const DEFAULT_NULLABLE_ENVELOPE = Object.freeze(['provenance']);

function buildPacket(
  protocolType,
  fields,
  { requiredPayload, nullableEnvelope = [], nullablePayload = [] },
) {
  const {
    id = generateId(),
    mission_id = null,
    producer,
    consumer,
    created_at = Date.now(),
    timestamp_confidence = 'CONFIRMED',
    authority_envelope = null,
    provenance = null,
    retention_class,
    ...payload
  } = fields || {};

  validatePayload(payload, requiredPayload, { nullableFields: nullablePayload });

  const integrity_digest = computeIntegrityDigest(payload);

  const packet = Object.freeze({
    protocol_type: protocolType,
    protocol_version: PROTOCOL_VERSION,
    id,
    mission_id,
    producer,
    consumer,
    created_at,
    timestamp_confidence,
    authority_envelope,
    provenance,
    integrity_digest,
    retention_class,
    ...payload,
  });

  const effectiveNullableEnvelope = [
    ...new Set([...DEFAULT_NULLABLE_ENVELOPE, ...nullableEnvelope]),
  ];
  validateEnvelope(packet, { nullableFields: effectiveNullableEnvelope });
  return packet;
}

export function createMissionPacket(fields) {
  return buildPacket('MissionPacket', fields, {
    requiredPayload: ['sealed_intent', 'objectives', 'constraints', 'lifecycle_state'],
    nullableEnvelope: ['provenance'],
  });
}

export function createTaskPacket(fields) {
  return buildPacket('TaskPacket', fields, {
    requiredPayload: ['task_id', 'capability_id', 'bounded_scope', 'lease_ref'],
    nullablePayload: ['lease_ref'],
  });
}

export function createCapabilityRequest(fields) {
  return buildPacket('CapabilityRequest', fields, {
    requiredPayload: ['capability_id', 'input_contract', 'output_contract', 'eligible_runtimes'],
  });
}

export function createAuthorityEnvelopePacket(fields) {
  return buildPacket('AuthorityEnvelope', fields, {
    requiredPayload: ['granted_by', 'authority_ceiling', 'prohibited_actions'],
    nullableEnvelope: ['authority_envelope', 'mission_id', 'provenance'],
  });
}

export function createRuntimeAttestation(fields) {
  return buildPacket('RuntimeAttestation', fields, {
    requiredPayload: ['runtime_id', 'runtime_class', 'capabilities', 'trust_level'],
    // Identity attestation may precede any authority grant or mission binding.
    nullableEnvelope: ['mission_id', 'authority_envelope', 'provenance'],
  });
}

export function createExecutionReceipt(fields) {
  return buildPacket('ExecutionReceipt', fields, {
    requiredPayload: [
      'executor_id',
      'capability_id',
      'input_digest',
      'output_digest',
      'observed_result',
      'error_state',
    ],
    nullablePayload: ['error_state'],
  });
}

export function createEvidencePacket(fields) {
  return buildPacket('EvidencePacket', fields, {
    requiredPayload: ['receipt_ref', 'observation', 'verification_verdict'],
  });
}

export function createLedgerEntry(fields) {
  return buildPacket('LedgerEntry', fields, {
    requiredPayload: ['sequence', 'entry_type', 'payload_ref', 'prev_hash'],
    nullablePayload: ['prev_hash'],
  });
}

// Generic parser: validates an already-constructed object against the
// envelope contract and returns it typed. Throws on unknown protocol_type.
export function parseProtocolPacket(obj) {
  if (obj === null || typeof obj !== 'object') {
    throw new ProtocolTypeError('Protocol packet must be a plain object');
  }
  if (!isPacketType(obj.protocol_type)) {
    throw new ProtocolTypeError(`Unknown protocol_type: ${obj.protocol_type}`, {
      protocol_type: obj.protocol_type,
    });
  }
  validateEnvelope(obj, { nullableFields: Object.keys(obj).filter((k) => obj[k] == null) });
  return obj;
}

export { buildPacket };
