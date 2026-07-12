import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  checkAuthorityCeiling,
  assertNoAuthorityMinting,
  requireHumanAuthorization,
  PROMOTION_BOUNDARY,
} from '../src/authority.js';
import { ProtocolAuthorityError } from '../src/errors.js';

function envelope(overrides = {}) {
  return {
    granted_by: 'founder',
    authority_ceiling: 'bounded_implementation',
    prohibited_actions: ['deploy', 'ratify'],
    ...overrides,
  };
}

test('sufficient authority passes', () => {
  assert.ok(checkAuthorityCeiling(envelope(), 'bounded_implementation'));
});

test('insufficient authority fails', () => {
  assert.throws(
    () => checkAuthorityCeiling(envelope(), 'deployment'),
    ProtocolAuthorityError,
  );
});

test('explicitly prohibited action fails even under a broad ceiling', () => {
  assert.throws(
    () => checkAuthorityCeiling(envelope({ authority_ceiling: 'ALL' }), 'deploy'),
    ProtocolAuthorityError,
  );
});

test('protocol cannot mint authority for itself', () => {
  assert.throws(
    () => assertNoAuthorityMinting(envelope({ granted_by: 'SELF' })),
    ProtocolAuthorityError,
  );
  assert.throws(() => assertNoAuthorityMinting(null), ProtocolAuthorityError);
  assert.ok(assertNoAuthorityMinting(envelope()));
});

test('requireHumanAuthorization reports without granting', () => {
  const report = requireHumanAuthorization('deployment needs a human');
  assert.equal(report.authority_required, true);
  assert.deepEqual(report.promotion_boundary, PROMOTION_BOUNDARY);
});

test('promotion boundary constant is frozen and never crossed', () => {
  assert.ok(Object.isFrozen(PROMOTION_BOUNDARY));
  assert.equal(PROMOTION_BOUNDARY.status, 'NOT_CROSSED');
  assert.equal(PROMOTION_BOUNDARY.validator_authority, 'NONE');
  assert.throws(() => {
    PROMOTION_BOUNDARY.status = 'CROSSED';
  }, TypeError);
});
