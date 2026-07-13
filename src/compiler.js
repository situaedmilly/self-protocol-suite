// SELF Compiler Boundary v0 — pure IR-to-execution-plan compiler.
// The compiler describes work. It does not perform work: it has no executor,
// no dispatcher, no tool invocation, and no dependency on clock, randomness,
// environment, filesystem, or network state.

import { createHash } from 'node:crypto';
import { validateSelfIR, normalizeSelfIR } from './ir.js';
import {
  EXECUTION_PLAN_VERSION,
  TERMINAL_PLAN_ACTIONS,
  PLAN_PHASE_OPERATIONS,
  validateExecutionPlan,
  normalizeExecutionPlan,
} from './execution-plan.js';
import { ProtocolTypeError } from './errors.js';

class CompilerError extends ProtocolTypeError {
  constructor(message, details) {
    super(message, details);
    this.name = 'CompilerError';
  }
}

// Deterministic content hash — a pure function of its input, never of clock or
// random state. Used only to derive stable identity fields from canonical IR.
function canonicalHash(value) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

// The structural phases every BOUNDED_MUTATION operation opens with, in fixed order.
const STRUCTURAL_PHASE_ORDER = Object.freeze(['INSPECT', 'MODIFY_AUTHORIZED_FILES', 'TEST']);

// Compile validated, normalized SELF IR into a deterministic, closed-vocabulary
// execution plan. Throws CompilerError if the input cannot be compiled without
// widening authority, widening scope, weakening evidence, or reordering continuation.
export function compileIRToExecutionPlan(ir) {
  if (!ir || typeof ir !== 'object' || Array.isArray(ir)) {
    throw new CompilerError('IR must be a plain object', { received: typeof ir });
  }

  // Re-validate and re-normalize defensively — the compiler never trusts a claimed
  // shape, only a proven one.
  validateSelfIR(ir);
  const normalizedIR = normalizeSelfIR(ir);

  const operationId = canonicalHash({ scope: 'SELF_EXECUTION_PLAN_OPERATION_ID', ir: normalizedIR });
  const correlationId = canonicalHash({ scope: 'SELF_EXECUTION_PLAN_CORRELATION_ID', ir: normalizedIR, operationId });

  // Authority: the plan's allowed set is filtered from the IR's allowed set —
  // it can only narrow, never add.
  const irAllowed = normalizedIR.Authority.allowed;
  const irDenied = normalizedIR.Authority.denied;
  const allowed = irAllowed.filter((a) => PLAN_PHASE_OPERATIONS.includes(a));
  const widened = allowed.filter((a) => !irAllowed.includes(a));
  if (widened.length > 0) {
    throw new CompilerError(`Compiler may not widen authority: ${widened.join(', ')}`, { widened });
  }
  const authority = {
    allowed,
    denied: Array.from(new Set([...irDenied, ...TERMINAL_PLAN_ACTIONS])),
    ceiling: normalizedIR.Authority.class,
  };

  // Scope: the plan's resources are exactly the IR's declared mutation scope —
  // no resource may appear that the IR did not declare.
  const irFiles = normalizedIR.Constraints.mutation_scope && normalizedIR.Constraints.mutation_scope.files
    ? [...normalizedIR.Constraints.mutation_scope.files]
    : [];
  const scope = {
    resources: [...irFiles],
    mutation_targets: [...irFiles],
  };

  // Phases: fixed structural phases (filtered to what authority actually allows),
  // followed by the IR's continuation order, verbatim. Deterministic given the
  // same normalized IR — no phase depends on anything but the IR content.
  const orderedOperations = [
    ...STRUCTURAL_PHASE_ORDER.filter((op) => authority.allowed.includes(op)),
    ...normalizedIR.Continuation.on_success,
  ];

  const seen = new Set();
  const phases = [];
  for (const operation of orderedOperations) {
    if (seen.has(operation)) continue;
    if (TERMINAL_PLAN_ACTIONS.includes(operation)) {
      throw new CompilerError(`Refusing to compile a terminal action into an executable phase: ${operation}`, { operation });
    }
    if (!authority.allowed.includes(operation)) {
      throw new CompilerError(`Refusing to compile an unauthorized action into a phase: ${operation}`, { operation });
    }
    if (!PLAN_PHASE_OPERATIONS.includes(operation)) {
      throw new CompilerError(`Refusing to compile an operation outside the closed phase vocabulary: ${operation}`, { operation });
    }
    seen.add(operation);
    phases.push({
      id: `phase-${phases.length}`,
      operation,
      depends_on: phases.length > 0 ? [phases[phases.length - 1].id] : [],
      evidence_required: operation === 'TEST' ? [...normalizedIR.Evidence.required] : [],
      stop_conditions: [...normalizedIR.Constraints.stop_on],
    });
  }

  if (phases.length === 0) {
    throw new CompilerError('Compiled execution plan must contain at least one phase');
  }

  // Evidence: every IR requirement must survive into the plan, unweakened.
  const evidence = {
    requirements: [...normalizedIR.Evidence.required],
    acceptance: normalizedIR.Evidence.acceptance ? { ...normalizedIR.Evidence.acceptance } : undefined,
  };
  const droppedEvidence = normalizedIR.Evidence.required.filter((req) => !evidence.requirements.includes(req));
  if (droppedEvidence.length > 0) {
    throw new CompilerError(`Compiler may not drop required evidence: ${droppedEvidence.join(', ')}`, { droppedEvidence });
  }

  // Continuation: ordered steps stay ordered; terminal_before only ever grows.
  const continuation = {
    success: [...normalizedIR.Continuation.on_success],
    failure: [...normalizedIR.Continuation.on_failure],
    terminal_before: Array.from(new Set([...normalizedIR.Continuation.terminal_before, ...TERMINAL_PLAN_ACTIONS])),
  };

  const plan = {
    plan_type: 'SELF_EXECUTION_PLAN',
    plan_version: EXECUTION_PLAN_VERSION,
    identity: { operation_id: operationId, correlation_id: correlationId },
    operation: { verb: normalizedIR.Operation.verb, subject: normalizedIR.Subject.kind },
    authority,
    scope,
    phases,
    evidence,
    continuation,
  };

  validateExecutionPlan(plan);
  return normalizeExecutionPlan(plan);
}
