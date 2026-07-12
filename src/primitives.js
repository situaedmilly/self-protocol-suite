// SELF Protocol Core v0 — closed primitive catalog.
// This module has no imports. It is the dependency-free root of the protocol core.

import { ProtocolDuplicatePrimitiveError } from './errors.js';

export const PRIMITIVE_NOUNS = Object.freeze([
  'MISSION',
  'TASK',
  'RUNTIME',
  'EXECUTOR',
  'CAPABILITY',
  'AUTHORITY',
  'EVIDENCE',
  'RECEIPT',
  'LEDGER_ENTRY',
  'ARTIFACT',
  'LEASE',
  'INTERRUPTION',
  'RECOVERY',
  'HANDOFF',
]);

export const PRIMITIVE_VERBS = Object.freeze([
  'DECLARE',
  'REQUEST',
  'LEASE',
  'EXECUTE',
  'OBSERVE',
  'VERIFY',
  'COMMIT',
  'EMIT',
  'TRANSFER',
  'ESCALATE',
  'REVOKE',
  'PAUSE',
  'RESUME',
  'SEAL',
]);

export const PACKET_TYPES = Object.freeze([
  'MissionPacket',
  'TaskPacket',
  'CapabilityRequest',
  'AuthorityEnvelope',
  'RuntimeAttestation',
  'ExecutionReceipt',
  'EvidencePacket',
  'LedgerEntry',
  'LeaseRecord',
  'InterruptionPacket',
  'RecoveryPacket',
  'HandoffPacket',
]);

function assertNoDuplicates(list, label) {
  const seen = new Set();
  for (const item of list) {
    if (seen.has(item)) {
      throw new ProtocolDuplicatePrimitiveError(`Duplicate ${label}: ${item}`, { item, label });
    }
    seen.add(item);
  }
}

assertNoDuplicates(PRIMITIVE_NOUNS, 'primitive noun');
assertNoDuplicates(PRIMITIVE_VERBS, 'primitive verb');
assertNoDuplicates(PACKET_TYPES, 'packet type');

export function isPrimitiveNoun(name) {
  return PRIMITIVE_NOUNS.includes(name);
}

export function isPrimitiveVerb(name) {
  return PRIMITIVE_VERBS.includes(name);
}

export function isPacketType(name) {
  return PACKET_TYPES.includes(name);
}

// Registration guard: proves duplicate primitives are rejected even for a
// hypothetical future extension path, without mutating the frozen catalogs.
export function assertRegistrationAllowed(catalog, name, label) {
  if (catalog.includes(name)) {
    throw new ProtocolDuplicatePrimitiveError(`Duplicate ${label}: ${name}`, { name, label });
  }
  return true;
}
