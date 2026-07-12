// SELF Protocol Core v0 — canonical serialization, integrity digests, and
// the explicit boundary between "an execution was witnessed" and
// "the output was semantically correct".

import { createHash, randomUUID } from 'node:crypto';
import { ProtocolTypeError, ProtocolEvidenceError } from './errors.js';

// Deterministic canonical serialization: object keys sorted recursively so
// that two structurally-equal payloads always serialize identically.
export function canonicalSerialize(value) {
  return JSON.stringify(canonicalize(value));
}

function canonicalize(value) {
  if (value === null || typeof value !== 'object') {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }
  const sortedKeys = Object.keys(value).sort();
  const result = {};
  for (const key of sortedKeys) {
    result[key] = canonicalize(value[key]);
  }
  return result;
}

export function computeIntegrityDigest(payload) {
  return createHash('sha256').update(canonicalSerialize(payload)).digest('hex');
}

export function generateId() {
  return randomUUID();
}

const RECEIPT_REQUIRED_FIELDS = [
  'executor_id',
  'capability_id',
  'input_digest',
  'output_digest',
  'observed_result',
  'error_state',
];

export function validateReceiptShape(receipt) {
  if (receipt === null || typeof receipt !== 'object') {
    throw new ProtocolTypeError('Receipt must be a plain object');
  }
  if (receipt.protocol_type !== 'ExecutionReceipt') {
    throw new ProtocolTypeError(`Expected ExecutionReceipt, received: ${receipt.protocol_type}`, {
      protocol_type: receipt.protocol_type,
    });
  }
  for (const field of RECEIPT_REQUIRED_FIELDS) {
    if (!(field in receipt)) {
      throw new ProtocolTypeError(`Missing load-bearing field: ${field}`, { field });
    }
  }
  if (receipt.observed_result === null || receipt.observed_result === undefined) {
    throw new ProtocolTypeError('Missing load-bearing field: observed_result');
  }
  return true;
}

// A valid receipt proves a governed execution record exists. It does NOT
// prove the output is semantically correct — that requires an independent
// EvidencePacket referencing the receipt with an explicit verification verdict.
export function receiptProvesExecutionOnly(receipt) {
  validateReceiptShape(receipt);
  return {
    execution_witnessed: true,
    semantically_verified: false,
    reason: 'A receipt proves an execution attempt was recorded, not that its output is correct.',
  };
}

export function verifyReceiptWithEvidence(receipt, evidencePacket) {
  validateReceiptShape(receipt);
  if (evidencePacket === null || typeof evidencePacket !== 'object') {
    throw new ProtocolEvidenceError('Evidence packet must be a plain object');
  }
  if (evidencePacket.protocol_type !== 'EvidencePacket') {
    throw new ProtocolEvidenceError(
      `Expected EvidencePacket, received: ${evidencePacket.protocol_type}`,
    );
  }
  if (evidencePacket.receipt_ref !== receipt.id) {
    throw new ProtocolEvidenceError('Evidence packet does not reference this receipt', {
      expected: receipt.id,
      received: evidencePacket.receipt_ref,
    });
  }
  const verdict = evidencePacket.verification_verdict;
  if (verdict !== 'VERIFIED' && verdict !== 'REFUTED' && verdict !== 'INDETERMINATE') {
    throw new ProtocolEvidenceError(`Unknown verification_verdict: ${verdict}`);
  }
  return {
    execution_witnessed: true,
    semantically_verified: verdict === 'VERIFIED',
    verdict,
  };
}

// Provenance chain: an ordered list of {producer, consumer, integrity_digest}
// hops. Each hop's consumer must equal the next hop's producer, and every
// hop must carry a non-empty integrity digest. Malformed chains fail closed.
export function validateProvenanceChain(chain) {
  if (!Array.isArray(chain) || chain.length === 0) {
    throw new ProtocolEvidenceError('Provenance chain must be a non-empty array');
  }
  for (const [index, hop] of chain.entries()) {
    if (hop === null || typeof hop !== 'object') {
      throw new ProtocolEvidenceError(`Malformed provenance hop at index ${index}`);
    }
    if (typeof hop.producer !== 'string' || hop.producer.length === 0) {
      throw new ProtocolEvidenceError(`Missing producer at provenance hop ${index}`);
    }
    if (typeof hop.consumer !== 'string' || hop.consumer.length === 0) {
      throw new ProtocolEvidenceError(`Missing consumer at provenance hop ${index}`);
    }
    if (typeof hop.integrity_digest !== 'string' || hop.integrity_digest.length === 0) {
      throw new ProtocolEvidenceError(`Missing integrity_digest at provenance hop ${index}`);
    }
    if (index > 0 && chain[index - 1].consumer !== hop.producer) {
      throw new ProtocolEvidenceError(
        `Provenance chain broken between hop ${index - 1} and hop ${index}`,
        { expectedProducer: chain[index - 1].consumer, actualProducer: hop.producer },
      );
    }
  }
  return true;
}
