import test from 'node:test';
import assert from 'node:assert/strict';
import {
  detectWorkflowSignals,
  requireWorkflowSignal,
  WorkflowSignalError,
} from '../src/workflow-signal.js';

test('resolves the highest-priority explicit signal', () => {
  const result = detectWorkflowSignals(`
    WORKFLOWEXECUTION_SIGNAL
    OBJECTIVE_SIGNAL
    MUTATION_SIGNAL
    VERIFICATION_SIGNAL
  `);
  assert.equal(result.state, 'SIGNAL_RESOLVED');
  assert.equal(result.controlling_signal, 'OBJECTIVE_SIGNAL');
  assert.deepEqual(result.signals, [
    'OBJECTIVE_SIGNAL',
    'MUTATION_SIGNAL',
    'VERIFICATION_SIGNAL',
  ]);
});

test('STOP_SIGNAL overrides every other signal', () => {
  const result = detectWorkflowSignals('OPERATING_SIGNAL STOP_SIGNAL SEAL_SIGNAL');
  assert.equal(result.state, 'STOP_SIGNAL_ACTIVE');
  assert.equal(result.controlling_signal, 'STOP_SIGNAL');
});

test('unmarked prose remains unclassified', () => {
  const result = detectWorkflowSignals('Please inspect the repository and fix it.');
  assert.equal(result.state, 'UNCLASSIFIED_SIGNAL');
  assert.equal(result.controlling_signal, null);
});

test('unknown signals fail closed', () => {
  assert.throws(
    () => detectWorkflowSignals('MAGIC_SIGNAL'),
    (error) => error instanceof WorkflowSignalError && error.code === 'UNKNOWN_SIGNAL'
  );
});

test('requireWorkflowSignal rejects unclassified prompts', () => {
  assert.throws(
    () => requireWorkflowSignal('No marker here'),
    (error) => error instanceof WorkflowSignalError && error.code === 'UNCLASSIFIED_SIGNAL'
  );
});

test('OPERATING_SIGNAL governs session-posture shifts', () => {
  const result = requireWorkflowSignal('WORKFLOWEXECUTION_SIGNAL\nSIGNAL: OPERATING_SIGNAL');
  assert.equal(result.controlling_signal, 'OPERATING_SIGNAL');
});
