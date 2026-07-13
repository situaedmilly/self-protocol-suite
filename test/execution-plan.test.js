// test/execution-plan.test.js
// SELF Compiler Boundary v0 — execution plan structural law tests.

import test from 'node:test';
import assert from 'node:assert';
import {
  EXECUTION_PLAN_VERSION,
  TERMINAL_PLAN_ACTIONS,
  PLAN_PHASE_OPERATIONS,
  validateExecutionPlan,
  normalizeExecutionPlan,
} from '../src/execution-plan.js';

function basePlan(overrides = {}) {
  return {
    plan_type: 'SELF_EXECUTION_PLAN',
    plan_version: EXECUTION_PLAN_VERSION,
    identity: { operation_id: 'op-1', correlation_id: 'corr-1' },
    operation: { verb: 'IMPLEMENT', subject: 'CommandRoutePersistenceGuard' },
    authority: {
      allowed: ['INSPECT', 'TEST', 'COMMIT'],
      denied: ['DEPLOY', 'MERGE_MAIN', 'PROMOTE', 'RATIFY'],
      ceiling: 'BOUNDED_MUTATION',
    },
    scope: {
      resources: ['persistence/pending-proposals.js'],
      mutation_targets: ['persistence/pending-proposals.js'],
    },
    phases: [
      { id: 'phase-0', operation: 'INSPECT', depends_on: [], evidence_required: [], stop_conditions: [] },
      { id: 'phase-1', operation: 'TEST', depends_on: ['phase-0'], evidence_required: ['PROTOCOL_SUITE'], stop_conditions: [] },
      { id: 'phase-2', operation: 'COMMIT', depends_on: ['phase-1'], evidence_required: [], stop_conditions: [] },
    ],
    evidence: {
      requirements: ['PROTOCOL_SUITE'],
      acceptance: { zero_failures: true, zero_divergences: true },
    },
    continuation: {
      success: ['COMMIT'],
      failure: ['STOP'],
      terminal_before: ['MERGE_MAIN'],
    },
    ...overrides,
  };
}

test('execution-plan: a well-formed plan validates and normalizes', (t) => {
  const plan = basePlan();
  assert.strictEqual(validateExecutionPlan(plan), true);
  const normalized = normalizeExecutionPlan(plan);
  assert.strictEqual(normalized.plan_type, 'SELF_EXECUTION_PLAN');
  assert(Object.isFrozen(normalized));
  assert(Object.isFrozen(normalized.phases));
});

test('execution-plan: normalization is deterministic', (t) => {
  const plan = basePlan();
  const n1 = normalizeExecutionPlan(plan);
  const n2 = normalizeExecutionPlan(basePlan());
  assert.deepStrictEqual(n1, n2);
  assert.strictEqual(JSON.stringify(n1), JSON.stringify(n2));
});

test('rejection: unknown top-level field is refused', (t) => {
  const plan = basePlan({ rogue_field: true });
  assert.throws(() => validateExecutionPlan(plan));
});

test('rejection: MERGE_MAIN in authority.allowed is refused', (t) => {
  const plan = basePlan();
  plan.authority = { ...plan.authority, allowed: [...plan.authority.allowed, 'MERGE_MAIN'] };
  assert.throws(() => validateExecutionPlan(plan));
});

test('rejection: DEPLOY in authority.allowed is refused', (t) => {
  const plan = basePlan();
  plan.authority = { ...plan.authority, allowed: [...plan.authority.allowed, 'DEPLOY'] };
  assert.throws(() => validateExecutionPlan(plan));
});

test('rejection: RATIFY in authority.allowed is refused', (t) => {
  const plan = basePlan();
  plan.authority = { ...plan.authority, allowed: [...plan.authority.allowed, 'RATIFY'] };
  assert.throws(() => validateExecutionPlan(plan));
});

test('rejection: PROMOTE in authority.allowed is refused', (t) => {
  const plan = basePlan();
  plan.authority = { ...plan.authority, allowed: [...plan.authority.allowed, 'PROMOTE'] };
  assert.throws(() => validateExecutionPlan(plan));
});

test('rejection: an action both allowed and denied is refused', (t) => {
  const plan = basePlan();
  plan.authority = { ...plan.authority, allowed: ['TEST'], denied: ['TEST'] };
  assert.throws(() => validateExecutionPlan(plan));
});

test('rejection: an unauthorized resource in mutation_targets is refused', (t) => {
  const plan = basePlan();
  plan.scope = {
    resources: ['persistence/pending-proposals.js'],
    mutation_targets: ['persistence/pending-proposals.js', 'persistence/unauthorized-file.js'],
  };
  assert.throws(() => validateExecutionPlan(plan));
});

test('rejection: empty evidence.requirements is refused', (t) => {
  const plan = basePlan();
  plan.evidence = { ...plan.evidence, requirements: [] };
  assert.throws(() => validateExecutionPlan(plan));
});

test('rejection: reordered phases (forward-referenced dependency) are refused', (t) => {
  const plan = basePlan();
  // phase-1 now appears before the phase-0 it depends on never existing yet —
  // simulate by swapping the array positions while keeping the id linkage.
  plan.phases = [
    { id: 'phase-1', operation: 'TEST', depends_on: ['phase-0'], evidence_required: ['PROTOCOL_SUITE'], stop_conditions: [] },
    { id: 'phase-0', operation: 'INSPECT', depends_on: [], evidence_required: [], stop_conditions: [] },
  ];
  assert.throws(() => validateExecutionPlan(plan));
});

test('rejection: continuing after STOP in continuation.success is refused', (t) => {
  const plan = basePlan();
  plan.continuation = { ...plan.continuation, success: ['COMMIT', 'STOP', 'PUSH_BRANCH'] };
  assert.throws(() => validateExecutionPlan(plan));
});

test('rejection: continuation.failure not ending in STOP is refused', (t) => {
  const plan = basePlan();
  plan.continuation = { ...plan.continuation, failure: ['COMMIT'] };
  assert.throws(() => validateExecutionPlan(plan));
});

test('rejection: a denied action inside an executable phase is refused', (t) => {
  const plan = basePlan();
  plan.authority = { ...plan.authority, denied: [...plan.authority.denied, 'COMMIT'] };
  assert.throws(() => validateExecutionPlan(plan));
});

test('rejection: an invented executor action outside the closed phase vocabulary is refused', (t) => {
  const plan = basePlan();
  plan.phases = [
    { id: 'phase-0', operation: 'DISPATCH_TO_EXTERNAL_EXECUTOR', depends_on: [], evidence_required: [], stop_conditions: [] },
  ];
  assert.throws(() => validateExecutionPlan(plan));
});

test('rejection: a named provider call outside the closed phase vocabulary is refused', (t) => {
  const plan = basePlan();
  plan.phases = [
    { id: 'phase-0', operation: 'CALL_EXTERNAL_LLM_PROVIDER_API', depends_on: [], evidence_required: [], stop_conditions: [] },
  ];
  assert.throws(() => validateExecutionPlan(plan));
});

test('rejection: an embedded executable command outside the closed phase vocabulary is refused', (t) => {
  const plan = basePlan();
  plan.phases = [
    { id: 'phase-0', operation: 'RUN_SHELL_COMMAND', depends_on: [], evidence_required: [], stop_conditions: [] },
  ];
  assert.throws(() => validateExecutionPlan(plan));
});

test('rejection: unsupported plan_version is refused', (t) => {
  const plan = basePlan({ plan_version: 'v1' });
  assert.throws(() => validateExecutionPlan(plan));
});

test('sanity: TERMINAL_PLAN_ACTIONS and PLAN_PHASE_OPERATIONS never overlap', (t) => {
  const overlap = PLAN_PHASE_OPERATIONS.filter((op) => TERMINAL_PLAN_ACTIONS.includes(op));
  assert.deepStrictEqual(overlap, []);
});
