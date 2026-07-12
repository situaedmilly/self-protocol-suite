import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createLeaseRecord,
  createInterruptionPacket,
  createRecoveryPacket,
  createHandoffPacket,
} from '../src/continuity.js';
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

test('lease packet validates', () => {
  const packet = createLeaseRecord(
    baseFields({
      leased_ref: 'task-1',
      executor_id: 'executor-1',
      expires_at: 1000,
      revocation_condition: null,
    }),
  );
  assert.equal(packet.protocol_type, 'LeaseRecord');
  assert.ok(Object.isFrozen(packet));
  assert.throws(
    () => createLeaseRecord(baseFields({ leased_ref: 'task-1' })),
    ProtocolTypeError,
  );
});

test('interruption packet validates', () => {
  const packet = createInterruptionPacket(
    baseFields({
      interruption_reason: 'executor_lost',
      last_verified_event: 'ledger-entry-7',
      unverified_actions: [],
    }),
  );
  assert.equal(packet.protocol_type, 'InterruptionPacket');
  assert.throws(
    () => createInterruptionPacket(baseFields({ interruption_reason: 'executor_lost' })),
    ProtocolTypeError,
  );
});

test('recovery packet validates', () => {
  const packet = createRecoveryPacket(
    baseFields({
      last_verified_event: 'ledger-entry-7',
      interruption_reason: 'executor_lost',
      safe_resume_point: null,
      candidate_executors: ['executor-2'],
    }),
  );
  assert.equal(packet.protocol_type, 'RecoveryPacket');
  assert.equal(packet.safe_resume_point, null);
  assert.throws(
    () => createRecoveryPacket(baseFields({ last_verified_event: 'ledger-entry-7' })),
    ProtocolTypeError,
  );
});

test('handoff packet validates', () => {
  const packet = createHandoffPacket(
    baseFields({
      from_executor: null,
      to_executor: 'executor-2',
      handoff_reason: 'lease_expired',
      mission_state_ref: 'ledger-entry-7',
    }),
  );
  assert.equal(packet.protocol_type, 'HandoffPacket');
  assert.equal(packet.from_executor, null);
  assert.throws(
    () => createHandoffPacket(baseFields({ to_executor: 'executor-2' })),
    ProtocolTypeError,
  );
});
