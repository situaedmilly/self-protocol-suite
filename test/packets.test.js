import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createMissionPacket,
  createTaskPacket,
  createCapabilityRequest,
  createAuthorityEnvelopePacket,
  createRuntimeAttestation,
  createExecutionReceipt,
  createEvidencePacket,
  createLedgerEntry,
  parseProtocolPacket,
} from '../src/packets.js';
import { ProtocolTypeError } from '../src/errors.js';

function baseFields(overrides = {}) {
  return {
    mission_id: 'mission-1',
    producer: 'runtime-a',
    consumer: 'runtime-b',
    retention_class: 'STANDARD',
    authority_envelope: 'authority-1',
    ...overrides,
  };
}

test('MissionPacket requires its payload fields', () => {
  assert.throws(
    () => createMissionPacket(baseFields({ sealed_intent: 'do the thing' })),
    ProtocolTypeError,
  );

  const packet = createMissionPacket(
    baseFields({
      sealed_intent: 'do the thing',
      objectives: ['a'],
      constraints: [],
      lifecycle_state: 'INITIALIZED',
    }),
  );
  assert.equal(packet.protocol_type, 'MissionPacket');
  assert.ok(Object.isFrozen(packet));
  assert.ok(packet.integrity_digest.length > 0);
});

test('required packet fields are enforced across types', () => {
  assert.throws(
    () => createExecutionReceipt(baseFields({ executor_id: 'exec-1' })),
    ProtocolTypeError,
  );
  assert.throws(
    () => createEvidencePacket(baseFields({ receipt_ref: 'receipt-1' })),
    ProtocolTypeError,
  );
  assert.throws(() => createLedgerEntry(baseFields({ sequence: 1 })), ProtocolTypeError);
});

test('unknown packet type fails', () => {
  assert.throws(
    () =>
      parseProtocolPacket({
        protocol_type: 'NotARealPacket',
        protocol_version: 'v0',
      }),
    ProtocolTypeError,
  );
});

test('TaskPacket allows a null lease_ref before a lease is acquired', () => {
  const packet = createTaskPacket(
    baseFields({
      task_id: 'task-1',
      capability_id: 'document_ocr',
      bounded_scope: { max_pages: 5 },
      lease_ref: null,
    }),
  );
  assert.equal(packet.lease_ref, null);
});

test('CapabilityRequest round-trips through the generic parser', () => {
  const packet = createCapabilityRequest(
    baseFields({
      capability_id: 'document_ocr',
      input_contract: 'image/png',
      output_contract: 'text/plain',
      eligible_runtimes: ['apple_vision'],
    }),
  );
  const reparsed = parseProtocolPacket(packet);
  assert.equal(reparsed.id, packet.id);
});

test('AuthorityEnvelope permits a null authority_envelope (root grant exemption)', () => {
  const packet = createAuthorityEnvelopePacket({
    producer: 'founder',
    consumer: 'runtime-a',
    retention_class: 'STANDARD',
    granted_by: 'founder',
    authority_ceiling: 'bounded_implementation',
    prohibited_actions: ['deploy'],
  });
  assert.equal(packet.authority_envelope, null);
  assert.equal(packet.mission_id, null);
});

test('RuntimeAttestation does not require a mission_id', () => {
  const packet = createRuntimeAttestation({
    producer: 'runtime-a',
    consumer: 'registry',
    retention_class: 'STANDARD',
    runtime_id: 'claudeself_worktree_01',
    runtime_class: 'code_executor',
    capabilities: ['filesystem_read'],
    trust_level: 'bounded',
  });
  assert.equal(packet.runtime_id, 'claudeself_worktree_01');
});
