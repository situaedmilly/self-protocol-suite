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

test('unknown signals classify without a blanket hold', () => {
  const result = requireWorkflowSignal('MAGIC_SIGNAL');
  assert.equal(result.state, 'UNKNOWN_SIGNAL');
  assert.equal(result.session_continuation, 'CONTINUE_LAWFUL_WORK');
  assert.deepEqual(result.unknown_signals, ['MAGIC_SIGNAL']);
  assert.equal(result.authority_granted, false);
});
test('unmarked authorized prose does not require a marker', () => {
  assert.equal(requireWorkflowSignal('Please inspect the repository').session_continuation, 'CONTINUE_LAWFUL_WORK');
});

test('OPERATING_SIGNAL governs session-posture shifts', () => {
  const result = requireWorkflowSignal('WORKFLOWEXECUTION_SIGNAL\nSIGNAL: OPERATING_SIGNAL');
  assert.equal(result.controlling_signal, 'OPERATING_SIGNAL');
});

test('envelope alone is not an unknown signal', () => {
  assert.equal(requireWorkflowSignal('WORKFLOWEXECUTION_SIGNAL').state, 'UNCLASSIFIED_SIGNAL');
});
test('quoted examples and prose mentions cannot issue stops', () => {
  for (const text of ['Explain STOP_SIGNAL please', '> STOP_SIGNAL', '\x60STOP_SIGNAL\x60', '\x60\x60\x60text\nSTOP_SIGNAL\n\x60\x60\x60', '~~~text\nSTOP_SIGNAL\n~~~']) {
    assert.equal(requireWorkflowSignal(text).state, 'UNCLASSIFIED_SIGNAL');
  }
});
test('explicit stop survives unknown and lower-priority markers', () => {
  const r = requireWorkflowSignal('MAGIC_SIGNAL\nSIGNAL: STOP_SIGNAL\nMUTATION_SIGNAL');
  assert.equal(r.state, 'STOP_SIGNAL_ACTIVE');
  assert.equal(r.session_continuation, 'HONOR_EXPLICIT_USER_STOP_SCOPE');
});
test('signal classification never grants effect authority', () => {
  for (const text of ['AUTHORITY_SIGNAL','MUTATION_SIGNAL','SEAL_SIGNAL','FOUNDATION_SIGNAL','']) {
    const r = requireWorkflowSignal(text);
    assert.equal(r.authority_granted, false);
    assert.equal(r.signal_required, false);
    assert.equal(r.session_continuation, 'CONTINUE_LAWFUL_WORK');
  }
});
test('invalid input remains rejected', () => {
  for (const value of [null,undefined,{},42]) assert.throws(()=>requireWorkflowSignal(value),e=>e instanceof WorkflowSignalError && e.code==='INVALID_PROMPT');
});
test('returned classification is immutable', () => {
  const r=requireWorkflowSignal('MAGIC_SIGNAL\nOPERATING_SIGNAL');
  assert.ok(Object.isFrozen(r));assert.ok(Object.isFrozen(r.signals));assert.ok(Object.isFrozen(r.unknown_signals));
});
