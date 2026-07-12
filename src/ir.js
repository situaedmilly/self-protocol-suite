// SELF IR Core v0 — canonical intermediate representation for bounded operations.
// Structures engineering intent into validated, normalized, unambiguous machine semantics.

import { ProtocolTypeError } from './errors.js';

export const IR_VERSION = 'v0';

export const OPERATION_VERBS = Object.freeze(['IMPLEMENT']);
export const OPERATION_MODES = Object.freeze(['SINGLE_SEAM']);

export const TARGET_SYSTEMS = Object.freeze(['Kernel', 'ProtocolCore', 'CloudNetwork', 'ControlPlane']);
export const SOURCE_SYSTEMS = Object.freeze(['Kernel', 'ProtocolCore', 'CloudNetwork', 'ControlPlane']);

export const AUTHORITY_CLASSES = Object.freeze(['BOUNDED_MUTATION', 'BOUNDED_READ_ONLY']);

export const AUTHORITY_ACTIONS = Object.freeze([
  'COMMIT',
  'INSPECT',
  'MERGE_MAIN',
  'MODIFY_AUTHORIZED_FILES',
  'OPEN_DRAFT_PR',
  'PUSH_BRANCH',
  'TEST',
]);

export const TERMINAL_ACTIONS = Object.freeze(['DEPLOY', 'MERGE_MAIN', 'PROMOTE', 'RATIFY']);

export const PRESERVED_INVARIANTS = Object.freeze([
  'DependencyPin',
  'ExternalDependencies',
  'HistoricalHashes',
  'KernelAPI',
  'SealedConsumers',
]);

export const STOP_CONDITIONS = Object.freeze([
  'ASSERTION_FAILURE',
  'DEPENDENCY_DRIFT',
  'REVERSE_IMPORT_DETECTED',
  'SEMANTIC_DIVERGENCE',
  'TEST_FAILURE',
  'UNAUTHORIZED_FILE',
]);

export const EVIDENCE_TYPES = Object.freeze([
  'DIFFERENTIAL_TESTS',
  'FULL_CONSUMER_SUITE',
  'PROTOCOL_SUITE',
  'STATIC_DEPENDENCY_CHECK',
]);

// Custom error for IR validation failures.
class ProtocolIRError extends ProtocolTypeError {
  constructor(message, context = {}) {
    super(message);
    this.name = 'ProtocolIRError';
    this.context = context;
  }
}

// Validate a complete IR object. Throws ProtocolIRError on failure.
export function validateSelfIR(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    throw new ProtocolIRError('IR must be a plain object', { received: typeof obj });
  }

  // Check for unknown top-level fields.
  const allowed = ['Authority', 'Constraints', 'Continuation', 'Evidence', 'Operation', 'Subject', 'ir_type', 'ir_version'];
  const unknown = Object.keys(obj).filter(k => !allowed.includes(k));
  if (unknown.length > 0) {
    throw new ProtocolIRError(`Unknown IR fields: ${unknown.join(', ')}`, { unknown });
  }

  // Validate required objects.
  if (!obj.ir_version) throw new ProtocolIRError('Missing ir_version');
  if (obj.ir_version !== IR_VERSION) throw new ProtocolIRError(`Unsupported ir_version: ${obj.ir_version}`);
  if (!obj.ir_type) throw new ProtocolIRError('Missing ir_type');
  if (!obj.Operation) throw new ProtocolIRError('Missing Operation object');
  if (!obj.Subject) throw new ProtocolIRError('Missing Subject object');
  if (!obj.Authority) throw new ProtocolIRError('Missing Authority object');
  if (!obj.Constraints) throw new ProtocolIRError('Missing Constraints object');
  if (!obj.Evidence) throw new ProtocolIRError('Missing Evidence object');
  if (!obj.Continuation) throw new ProtocolIRError('Missing Continuation object');

  // Validate Operation.
  const op = obj.Operation;
  if (!OPERATION_VERBS.includes(op.verb)) {
    throw new ProtocolIRError(`Unknown operation verb: ${op.verb}`, { verb: op.verb });
  }
  if (!OPERATION_MODES.includes(op.mode)) {
    throw new ProtocolIRError(`Unknown operation mode: ${op.mode}`, { mode: op.mode });
  }

  // Validate Subject.
  const subj = obj.Subject;
  if (!subj.kind || typeof subj.kind !== 'string') {
    throw new ProtocolIRError('Subject.kind must be a non-empty string');
  }
  if (!TARGET_SYSTEMS.includes(subj.target)) {
    throw new ProtocolIRError(`Unknown Subject.target: ${subj.target}`, { target: subj.target });
  }
  if (op.verb === 'IMPLEMENT' && (!subj.source || !SOURCE_SYSTEMS.includes(subj.source))) {
    throw new ProtocolIRError(`Subject.source required for IMPLEMENT, got: ${subj.source}`, { source: subj.source });
  }

  // Validate Authority.
  const auth = obj.Authority;
  if (!AUTHORITY_CLASSES.includes(auth.class)) {
    throw new ProtocolIRError(`Unknown authority class: ${auth.class}`, { class: auth.class });
  }
  if (!Array.isArray(auth.allowed) || !Array.isArray(auth.denied)) {
    throw new ProtocolIRError('Authority.allowed and Authority.denied must be arrays');
  }

  // Check for overlap between allowed and denied.
  const overlap = auth.allowed.filter(a => auth.denied.includes(a));
  if (overlap.length > 0) {
    throw new ProtocolIRError(`Authority overlap (allowed ∩ denied): ${overlap.join(', ')}`, { overlap });
  }

  // Check that terminal actions are not in allowed (v0 forbids them).
  const terminalInAllowed = auth.allowed.filter(a => TERMINAL_ACTIONS.includes(a));
  if (terminalInAllowed.length > 0) {
    throw new ProtocolIRError(`Terminal actions forbidden in v0 allowed: ${terminalInAllowed.join(', ')}`, { actions: terminalInAllowed });
  }

  // Validate Constraints.
  const constraints = obj.Constraints;
  if (op.verb === 'IMPLEMENT') {
    if (!constraints.mutation_scope || !Array.isArray(constraints.mutation_scope.files) || constraints.mutation_scope.files.length === 0) {
      throw new ProtocolIRError('Constraints.mutation_scope.files required and must be non-empty for IMPLEMENT');
    }
  }

  if (Array.isArray(constraints.preserve)) {
    const unknown = constraints.preserve.filter(p => !PRESERVED_INVARIANTS.includes(p));
    if (unknown.length > 0) {
      throw new ProtocolIRError(`Unknown preserve invariants: ${unknown.join(', ')}`, { unknown });
    }
  }

  if (Array.isArray(constraints.stop_on)) {
    const unknown = constraints.stop_on.filter(s => !STOP_CONDITIONS.includes(s));
    if (unknown.length > 0) {
      throw new ProtocolIRError(`Unknown stop conditions: ${unknown.join(', ')}`, { unknown });
    }
  }

  // Validate Evidence.
  const evidence = obj.Evidence;
  if (!Array.isArray(evidence.required) || evidence.required.length === 0) {
    throw new ProtocolIRError('Evidence.required must be a non-empty array');
  }
  const unknownEvidence = evidence.required.filter(e => !EVIDENCE_TYPES.includes(e));
  if (unknownEvidence.length > 0) {
    throw new ProtocolIRError(`Unknown evidence types: ${unknownEvidence.join(', ')}`, { unknown: unknownEvidence });
  }

  if (evidence.acceptance && typeof evidence.acceptance === 'object') {
    if (evidence.acceptance.zero_failures !== true || evidence.acceptance.zero_divergences !== true) {
      throw new ProtocolIRError('Evidence acceptance must require zero_failures and zero_divergences');
    }
  }

  // Validate Continuation.
  const cont = obj.Continuation;
  if (!Array.isArray(cont.on_success)) {
    throw new ProtocolIRError('Continuation.on_success must be an array');
  }
  if (!Array.isArray(cont.on_failure)) {
    throw new ProtocolIRError('Continuation.on_failure must be an array');
  }

  // Check that on_failure terminates.
  if (cont.on_failure.length === 0 || cont.on_failure[cont.on_failure.length - 1] !== 'STOP') {
    throw new ProtocolIRError('Continuation.on_failure must end with STOP');
  }

  // Check that continuation actions don't violate authority.
  const allContinuation = [...cont.on_success, ...cont.on_failure];
  const violating = allContinuation.filter(a => auth.denied.includes(a));
  if (violating.length > 0) {
    throw new ProtocolIRError(`Continuation requests denied actions: ${violating.join(', ')}`, { actions: violating });
  }

  return true;
}

// Normalize an already-valid IR to canonical form. Throws ProtocolIRError if invalid.
export function normalizeSelfIR(obj) {
  validateSelfIR(obj);

  // Normalize each object separately, then freeze.
  const normalized = {
    ir_type: 'SELF_OPERATION',
    ir_version: IR_VERSION,
    Operation: Object.freeze({ ...obj.Operation }),
    Subject: Object.freeze({ ...obj.Subject }),
    Authority: Object.freeze({
      class: obj.Authority.class,
      allowed: Object.freeze(Array.from(obj.Authority.allowed).sort()),
      denied: Object.freeze(Array.from(obj.Authority.denied).sort()),
    }),
    Constraints: Object.freeze({
      preserve: Object.freeze(Array.from(obj.Constraints.preserve || []).sort()),
      mutation_scope: obj.Constraints.mutation_scope ? Object.freeze({
        files: Object.freeze(Array.from(obj.Constraints.mutation_scope.files).sort()),
      }) : undefined,
      stop_on: Object.freeze(Array.from(obj.Constraints.stop_on || []).sort()),
    }),
    Evidence: Object.freeze({
      required: Object.freeze(Array.from(obj.Evidence.required).sort()),
      acceptance: obj.Evidence.acceptance ? Object.freeze({ ...obj.Evidence.acceptance }) : undefined,
    }),
    Continuation: Object.freeze({
      on_success: Object.freeze([...obj.Continuation.on_success]), // Preserve order
      on_failure: Object.freeze([...obj.Continuation.on_failure]), // Preserve order
      terminal_before: Object.freeze(Array.from(obj.Continuation.terminal_before || []).sort()),
    }),
  };

  return Object.freeze(normalized);
}

// Compile a structured instruction object (not prose) into validated, normalized IR.
export function compileInstructionToIR(instruction) {
  if (!instruction || typeof instruction !== 'object' || Array.isArray(instruction)) {
    throw new ProtocolIRError('Instruction must be a plain object', { received: typeof instruction });
  }

  // Build the IR object from instruction.
  const ir = {
    ir_type: 'SELF_OPERATION',
    ir_version: IR_VERSION,
    Operation: {
      verb: instruction.verb || 'IMPLEMENT',
      mode: 'SINGLE_SEAM', // v0 only supports this
    },
    Subject: {
      kind: instruction.subject,
      target: instruction.target,
      source: instruction.source || null,
    },
    Authority: {
      class: instruction.authorityClass || 'BOUNDED_MUTATION',
      allowed: instruction.authorityClass === 'BOUNDED_READ_ONLY'
        ? ['INSPECT', 'TEST', 'OPEN_DRAFT_PR']
        : ['COMMIT', 'INSPECT', 'MODIFY_AUTHORIZED_FILES', 'OPEN_DRAFT_PR', 'PUSH_BRANCH', 'TEST'],
      denied: Array.from(TERMINAL_ACTIONS), // Always forbidden in v0
    },
    Constraints: {
      preserve: instruction.preserve || [],
      mutation_scope: instruction.files ? { files: instruction.files } : {},
      stop_on: [
        'ASSERTION_FAILURE',
        'DEPENDENCY_DRIFT',
        'REVERSE_IMPORT_DETECTED',
        'SEMANTIC_DIVERGENCE',
        'TEST_FAILURE',
        'UNAUTHORIZED_FILE',
      ],
    },
    Evidence: {
      required: instruction.evidence || [],
      acceptance: {
        zero_failures: true,
        zero_divergences: true,
      },
    },
    Continuation: {
      on_success: instruction.deliver || [],
      on_failure: ['STOP'], // v0 always stops on failure
      terminal_before: instruction.stopBefore || Array.from(TERMINAL_ACTIONS),
    },
  };

  // Validate and normalize.
  validateSelfIR(ir);
  return normalizeSelfIR(ir);
}
