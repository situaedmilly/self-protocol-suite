// SELF Compiler Boundary v0 — execution plan contract.
// The execution plan is the compiler's sole output: a deterministic, closed-vocabulary
// description of bounded work. It contains no provider, model, API, terminal-command,
// repository host, or operating-system implementation detail.

import { ProtocolTypeError } from './errors.js';

export const EXECUTION_PLAN_VERSION = 'v0';

// Actions that end a lifecycle. A terminal action may never appear inside an
// executable phase, in authority.allowed, or unmarked inside a continuation array.
export const TERMINAL_PLAN_ACTIONS = Object.freeze(['DEPLOY', 'MERGE_MAIN', 'PROMOTE', 'RATIFY']);

// Closed vocabulary of actions a phase may declare. Anything outside this set is
// refused — an invented executor, a named provider, and an embedded command all fail
// the same closed-vocabulary check.
export const PLAN_PHASE_OPERATIONS = Object.freeze([
  'COMMIT',
  'INSPECT',
  'MODIFY_AUTHORIZED_FILES',
  'OPEN_DRAFT_PR',
  'PUSH_BRANCH',
  'TEST',
]);

const TOP_LEVEL_FIELDS = Object.freeze([
  'plan_type',
  'plan_version',
  'identity',
  'operation',
  'authority',
  'scope',
  'phases',
  'evidence',
  'continuation',
]);

class ExecutionPlanError extends ProtocolTypeError {
  constructor(message, details) {
    super(message, details);
    this.name = 'ExecutionPlanError';
  }
}

function assertNoContinueAfterStop(list, label) {
  const stopIndex = list.indexOf('STOP');
  if (stopIndex !== -1 && stopIndex !== list.length - 1) {
    throw new ExecutionPlanError(`${label} continues after STOP`, { list });
  }
}

// Validate a complete execution plan object. Throws ExecutionPlanError on failure.
export function validateExecutionPlan(plan) {
  if (!plan || typeof plan !== 'object' || Array.isArray(plan)) {
    throw new ExecutionPlanError('Execution plan must be a plain object', { received: typeof plan });
  }

  const unknownTop = Object.keys(plan).filter((k) => !TOP_LEVEL_FIELDS.includes(k));
  if (unknownTop.length > 0) {
    throw new ExecutionPlanError(`Unknown execution plan fields: ${unknownTop.join(', ')}`, { unknown: unknownTop });
  }

  if (plan.plan_type !== 'SELF_EXECUTION_PLAN') {
    throw new ExecutionPlanError(`Unknown plan_type: ${plan.plan_type}`, { plan_type: plan.plan_type });
  }
  if (plan.plan_version !== EXECUTION_PLAN_VERSION) {
    throw new ExecutionPlanError(`Unsupported plan_version: ${plan.plan_version}`, { plan_version: plan.plan_version });
  }

  const identity = plan.identity;
  if (!identity || typeof identity.operation_id !== 'string' || identity.operation_id === '') {
    throw new ExecutionPlanError('identity.operation_id must be a non-empty string');
  }
  if (typeof identity.correlation_id !== 'string' || identity.correlation_id === '') {
    throw new ExecutionPlanError('identity.correlation_id must be a non-empty string');
  }

  const operation = plan.operation;
  if (!operation || typeof operation.verb !== 'string' || operation.verb === '') {
    throw new ExecutionPlanError('operation.verb must be a non-empty string');
  }
  if (typeof operation.subject !== 'string' || operation.subject === '') {
    throw new ExecutionPlanError('operation.subject must be a non-empty string');
  }

  const authority = plan.authority;
  if (!authority || !Array.isArray(authority.allowed) || !Array.isArray(authority.denied)) {
    throw new ExecutionPlanError('authority.allowed and authority.denied must be arrays');
  }
  if (typeof authority.ceiling !== 'string' || authority.ceiling === '') {
    throw new ExecutionPlanError('authority.ceiling must be a non-empty string');
  }
  const overlap = authority.allowed.filter((a) => authority.denied.includes(a));
  if (overlap.length > 0) {
    throw new ExecutionPlanError(`Authority overlap (allowed and denied): ${overlap.join(', ')}`, { overlap });
  }
  const terminalInAllowed = authority.allowed.filter((a) => TERMINAL_PLAN_ACTIONS.includes(a));
  if (terminalInAllowed.length > 0) {
    throw new ExecutionPlanError(`Terminal actions forbidden in authority.allowed: ${terminalInAllowed.join(', ')}`, { actions: terminalInAllowed });
  }
  const unknownAllowed = authority.allowed.filter((a) => !PLAN_PHASE_OPERATIONS.includes(a));
  if (unknownAllowed.length > 0) {
    throw new ExecutionPlanError(`Unknown actions in authority.allowed: ${unknownAllowed.join(', ')}`, { actions: unknownAllowed });
  }

  const scope = plan.scope;
  if (!scope || !Array.isArray(scope.resources) || !Array.isArray(scope.mutation_targets)) {
    throw new ExecutionPlanError('scope.resources and scope.mutation_targets must be arrays');
  }
  const undeclaredTargets = scope.mutation_targets.filter((m) => !scope.resources.includes(m));
  if (undeclaredTargets.length > 0) {
    throw new ExecutionPlanError(`scope.mutation_targets contains resources outside scope.resources: ${undeclaredTargets.join(', ')}`, { undeclaredTargets });
  }

  if (!Array.isArray(plan.phases) || plan.phases.length === 0) {
    throw new ExecutionPlanError('phases must be a non-empty array');
  }
  const seenIds = new Set();
  plan.phases.forEach((phase, index) => {
    if (!phase || typeof phase.id !== 'string' || phase.id === '') {
      throw new ExecutionPlanError(`phases[${index}].id must be a non-empty string`);
    }
    if (seenIds.has(phase.id)) {
      throw new ExecutionPlanError(`Duplicate phase id: ${phase.id}`, { id: phase.id });
    }
    if (typeof phase.operation !== 'string' || !PLAN_PHASE_OPERATIONS.includes(phase.operation)) {
      throw new ExecutionPlanError(`phases[${index}].operation is not in the closed phase vocabulary: ${phase.operation}`, { operation: phase.operation });
    }
    if (TERMINAL_PLAN_ACTIONS.includes(phase.operation)) {
      throw new ExecutionPlanError(`Terminal action present in an executable phase: ${phase.operation}`, { operation: phase.operation });
    }
    if (authority.denied.includes(phase.operation)) {
      throw new ExecutionPlanError(`Denied action present in an executable phase: ${phase.operation}`, { operation: phase.operation });
    }
    if (!Array.isArray(phase.depends_on)) {
      throw new ExecutionPlanError(`phases[${index}].depends_on must be an array`);
    }
    phase.depends_on.forEach((dep) => {
      if (!seenIds.has(dep)) {
        throw new ExecutionPlanError(`phases[${index}] depends_on an unknown or forward-referenced phase: ${dep}`, { dep });
      }
    });
    if (!Array.isArray(phase.evidence_required)) {
      throw new ExecutionPlanError(`phases[${index}].evidence_required must be an array`);
    }
    if (!Array.isArray(phase.stop_conditions)) {
      throw new ExecutionPlanError(`phases[${index}].stop_conditions must be an array`);
    }
    seenIds.add(phase.id);
  });

  const evidence = plan.evidence;
  if (!evidence || !Array.isArray(evidence.requirements) || evidence.requirements.length === 0) {
    throw new ExecutionPlanError('evidence.requirements must be a non-empty array');
  }

  const continuation = plan.continuation;
  if (!continuation || !Array.isArray(continuation.success) || !Array.isArray(continuation.failure)) {
    throw new ExecutionPlanError('continuation.success and continuation.failure must be arrays');
  }
  if (!Array.isArray(continuation.terminal_before)) {
    throw new ExecutionPlanError('continuation.terminal_before must be an array');
  }
  assertNoContinueAfterStop(continuation.success, 'continuation.success');
  assertNoContinueAfterStop(continuation.failure, 'continuation.failure');
  if (continuation.failure.length === 0 || continuation.failure[continuation.failure.length - 1] !== 'STOP') {
    throw new ExecutionPlanError('continuation.failure must end with STOP');
  }
  const allContinuation = [...continuation.success, ...continuation.failure];
  const deniedInContinuation = allContinuation.filter((a) => a !== 'STOP' && authority.denied.includes(a));
  if (deniedInContinuation.length > 0) {
    throw new ExecutionPlanError(`Continuation requests denied actions: ${deniedInContinuation.join(', ')}`, { actions: deniedInContinuation });
  }
  const terminalInContinuation = allContinuation.filter((a) => TERMINAL_PLAN_ACTIONS.includes(a));
  if (terminalInContinuation.length > 0) {
    throw new ExecutionPlanError(`Terminal action present in continuation: ${terminalInContinuation.join(', ')}`, { actions: terminalInContinuation });
  }

  return true;
}

// Normalize an already-valid execution plan to canonical, deterministic, frozen form.
export function normalizeExecutionPlan(plan) {
  validateExecutionPlan(plan);

  return Object.freeze({
    plan_type: 'SELF_EXECUTION_PLAN',
    plan_version: EXECUTION_PLAN_VERSION,
    identity: Object.freeze({
      operation_id: plan.identity.operation_id,
      correlation_id: plan.identity.correlation_id,
    }),
    operation: Object.freeze({
      verb: plan.operation.verb,
      subject: plan.operation.subject,
    }),
    authority: Object.freeze({
      allowed: Object.freeze(Array.from(plan.authority.allowed).sort()),
      denied: Object.freeze(Array.from(plan.authority.denied).sort()),
      ceiling: plan.authority.ceiling,
    }),
    scope: Object.freeze({
      resources: Object.freeze(Array.from(plan.scope.resources).sort()),
      mutation_targets: Object.freeze(Array.from(plan.scope.mutation_targets).sort()),
    }),
    // Phase order is semantic (dependency order) and is preserved, not sorted.
    phases: Object.freeze(plan.phases.map((phase) => Object.freeze({
      id: phase.id,
      operation: phase.operation,
      depends_on: Object.freeze([...phase.depends_on]),
      evidence_required: Object.freeze(Array.from(phase.evidence_required).sort()),
      stop_conditions: Object.freeze(Array.from(phase.stop_conditions).sort()),
    }))),
    evidence: Object.freeze({
      requirements: Object.freeze(Array.from(plan.evidence.requirements).sort()),
      acceptance: plan.evidence.acceptance ? Object.freeze({ ...plan.evidence.acceptance }) : undefined,
    }),
    continuation: Object.freeze({
      success: Object.freeze([...plan.continuation.success]),
      failure: Object.freeze([...plan.continuation.failure]),
      terminal_before: Object.freeze(Array.from(plan.continuation.terminal_before).sort()),
    }),
  });
}
