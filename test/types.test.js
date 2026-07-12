import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateEnvelope, ENVELOPE_FIELDS } from '../src/types.js';
import { ProtocolTypeError } from '../src/errors.js';

function fullEnvelope(overrides = {}) {
  return {
    protocol_type: 'MissionPacket',
    protocol_version: 'v0',
    id: 'id-1',
    mission_id: 'mission-1',
    producer: 'runtime-a',
    consumer: 'runtime-b',
    created_at: 0,
    timestamp_confidence: 'CONFIRMED',
    authority_envelope: 'authority-1',
    provenance: null,
    integrity_digest: 'deadbeef',
    retention_class: 'STANDARD',
    ...overrides,
  };
}

test('a fully-populated envelope validates', () => {
  assert.ok(validateEnvelope(fullEnvelope(), { nullableFields: ['provenance'] }));
});

test('missing envelope field fails closed', () => {
  const obj = fullEnvelope();
  delete obj.producer;
  assert.throws(() => validateEnvelope(obj), ProtocolTypeError);
});

test('null field not declared nullable fails closed', () => {
  const obj = fullEnvelope({ producer: null });
  assert.throws(() => validateEnvelope(obj), ProtocolTypeError);
});

test('null field declared nullable is accepted', () => {
  const obj = fullEnvelope({ provenance: null });
  assert.ok(validateEnvelope(obj, { nullableFields: ['provenance'] }));
});

test('unknown protocol_type fails closed', () => {
  const obj = fullEnvelope({ protocol_type: 'NotARealPacket' });
  assert.throws(() => validateEnvelope(obj), ProtocolTypeError);
});

test('all documented envelope fields are checked', () => {
  assert.equal(ENVELOPE_FIELDS.length, 12);
});
