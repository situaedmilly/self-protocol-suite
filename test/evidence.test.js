import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  canonicalSerialize,
  computeIntegrityDigest,
  receiptProvesExecutionOnly,
  verifyReceiptWithEvidence,
  validateProvenanceChain,
} from '../src/evidence.js';
import { createExecutionReceipt, createEvidencePacket } from '../src/packets.js';
import { ProtocolTypeError, ProtocolEvidenceError } from '../src/errors.js';

test('deterministic serialization is stable regardless of key order', () => {
  const a = { b: 1, a: 2, c: { y: 1, x: 2 } };
  const b = { a: 2, c: { x: 2, y: 1 }, b: 1 };
  assert.equal(canonicalSerialize(a), canonicalSerialize(b));
});

test('integrity digest changes when payload changes', () => {
  const digestA = computeIntegrityDigest({ value: 1 });
  const digestB = computeIntegrityDigest({ value: 2 });
  const digestARepeat = computeIntegrityDigest({ value: 1 });
  assert.notEqual(digestA, digestB);
  assert.equal(digestA, digestARepeat);
});

function makeReceipt(overrides = {}) {
  return createExecutionReceipt({
    mission_id: 'mission-1',
    producer: 'executor-1',
    consumer: 'kernel',
    retention_class: 'STANDARD',
    authority_envelope: 'authority-1',
    executor_id: 'executor-1',
    capability_id: 'document_ocr',
    input_digest: 'in-digest',
    output_digest: 'out-digest',
    observed_result: 'SUCCESS',
    error_state: null,
    ...overrides,
  });
}

test('receipt validation succeeds for a valid receipt', () => {
  const receipt = makeReceipt();
  const result = receiptProvesExecutionOnly(receipt);
  assert.equal(result.execution_witnessed, true);
});

test('receipt does not imply semantic verification', () => {
  const receipt = makeReceipt();
  const result = receiptProvesExecutionOnly(receipt);
  assert.equal(result.semantically_verified, false);
});

test('an unrelated evidence packet cannot verify a receipt', () => {
  const receipt = makeReceipt();
  const evidence = createEvidencePacket({
    mission_id: 'mission-1',
    producer: 'witness-1',
    consumer: 'kernel',
    retention_class: 'STANDARD',
    authority_envelope: 'authority-1',
    receipt_ref: 'some-other-receipt-id',
    observation: 'divergent',
    verification_verdict: 'VERIFIED',
  });
  assert.throws(() => verifyReceiptWithEvidence(receipt, evidence), ProtocolEvidenceError);
});

test('a matching evidence packet reports the verdict, not automatic success', () => {
  const receipt = makeReceipt();
  const evidence = createEvidencePacket({
    mission_id: 'mission-1',
    producer: 'witness-1',
    consumer: 'kernel',
    retention_class: 'STANDARD',
    authority_envelope: 'authority-1',
    receipt_ref: receipt.id,
    observation: 'matches',
    verification_verdict: 'VERIFIED',
  });
  const result = verifyReceiptWithEvidence(receipt, evidence);
  assert.equal(result.semantically_verified, true);
  assert.equal(result.verdict, 'VERIFIED');
});

test('malformed provenance fails', () => {
  assert.throws(() => validateProvenanceChain([]), ProtocolEvidenceError);
  assert.throws(
    () => validateProvenanceChain([{ producer: 'a', consumer: 'b' }]),
    ProtocolEvidenceError,
  );
  assert.throws(
    () =>
      validateProvenanceChain([
        { producer: 'a', consumer: 'b', integrity_digest: 'x' },
        { producer: 'c', consumer: 'd', integrity_digest: 'y' },
      ]),
    ProtocolEvidenceError,
  );
});

test('a well-formed provenance chain validates', () => {
  assert.ok(
    validateProvenanceChain([
      { producer: 'a', consumer: 'b', integrity_digest: 'x' },
      { producer: 'b', consumer: 'c', integrity_digest: 'y' },
    ]),
  );
});
