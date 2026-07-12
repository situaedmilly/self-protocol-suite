import { test } from 'node:test';
import assert from 'node:assert/strict';
import { transitionMission, isTerminalState, legalNextStates } from '../src/state-machine.js';
import { ProtocolStateError } from '../src/errors.js';

test('legal lifecycle transitions succeed', () => {
  assert.equal(transitionMission('INITIALIZED', 'ORIENTED'), 'ORIENTED');
  assert.equal(transitionMission('ORIENTED', 'EXECUTING'), 'EXECUTING');
  assert.equal(transitionMission('EXECUTING', 'COMPLETED'), 'COMPLETED');
  assert.equal(transitionMission('COMPLETED', 'SEALED'), 'SEALED');
});

test('illegal lifecycle transition fails', () => {
  assert.throws(() => transitionMission('INITIALIZED', 'EXECUTING'), ProtocolStateError);
  assert.throws(() => transitionMission('ORIENTED', 'SEALED'), ProtocolStateError);
  assert.throws(() => transitionMission('EXECUTING', 'INITIALIZED'), ProtocolStateError);
});

test('terminal states remain terminal', () => {
  assert.ok(isTerminalState('FAILED'));
  assert.ok(isTerminalState('SEALED'));
  assert.deepEqual(legalNextStates('FAILED'), []);
  assert.deepEqual(legalNextStates('SEALED'), []);
  assert.throws(() => transitionMission('FAILED', 'ORIENTED'), ProtocolStateError);
  assert.throws(() => transitionMission('SEALED', 'EXECUTING'), ProtocolStateError);
});

test('unknown states fail closed', () => {
  assert.throws(() => transitionMission('NOT_A_STATE', 'ORIENTED'), ProtocolStateError);
  assert.throws(() => transitionMission('INITIALIZED', 'NOT_A_STATE'), ProtocolStateError);
});
