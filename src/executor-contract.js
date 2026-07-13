// SELF Compiler Boundary v0 — abstract executor contract.
// Declares what any executor must and must not do with a compiled execution plan.
// Defines no executor: no dispatch, no tool invocation, no repository mutation.

import { ProtocolTypeError } from './errors.js';

export const EXECUTOR_CONTRACT_VERSION = 'v0';

const CONTRACT_ACCEPTS = Object.freeze(['SELF_EXECUTION_PLAN']);
const CONTRACT_RETURNS = Object.freeze(['EXECUTION_RECEIPT', 'EVIDENCE_PACKET']);

const REQUIRED_MUST = Object.freeze([
  'preserve_operation_identity',
  'preserve_authority_ceiling',
  'remain_within_scope',
  'emit_required_evidence',
  'terminate_on_stop_condition',
]);

const REQUIRED_MUST_NOT = Object.freeze([
  'infer_authority',
  'widen_scope',
  'rewrite_plan_semantics',
  'claim_semantic_success_from_process_success',
  'continue_after_terminal_boundary',
]);

const RECEIPT_FIELDS = Object.freeze([
  'receipt_type',
  'operation_id',
  'correlation_id',
  'phases_executed',
  'scope_touched',
  'evidence_references',
]);

class ExecutorContractError extends ProtocolTypeError {
  constructor(message, details) {
    super(message, details);
    this.name = 'ExecutorContractError';
  }
}

// Validate that a declared executor contract meets the constitutional minimum:
// it accepts only execution plans, returns only receipts/evidence, and carries
// the full, non-overlapping set of required obligations and prohibitions.
export function validateExecutorContract(contract) {
  if (!contract || typeof contract !== 'object' || Array.isArray(contract)) {
    throw new ExecutorContractError('Executor contract must be a plain object', { received: typeof contract });
  }

  const allowedFields = ['executor_contract_version', 'accepts', 'returns', 'must', 'must_not'];
  const unknown = Object.keys(contract).filter((k) => !allowedFields.includes(k));
  if (unknown.length > 0) {
    throw new ExecutorContractError(`Unknown executor contract fields: ${unknown.join(', ')}`, { unknown });
  }

  if (contract.executor_contract_version !== EXECUTOR_CONTRACT_VERSION) {
    throw new ExecutorContractError(`Unsupported executor_contract_version: ${contract.executor_contract_version}`, {
      version: contract.executor_contract_version,
    });
  }

  if (!Array.isArray(contract.accepts) || contract.accepts.length === 0 || contract.accepts.some((a) => !CONTRACT_ACCEPTS.includes(a))) {
    throw new ExecutorContractError('accepts must be a non-empty subset of the declared accepted plan types', { accepts: contract.accepts });
  }
  if (!Array.isArray(contract.returns) || contract.returns.length === 0 || contract.returns.some((r) => !CONTRACT_RETURNS.includes(r))) {
    throw new ExecutorContractError('returns must be a non-empty subset of the declared return artifacts', { returns: contract.returns });
  }

  if (!Array.isArray(contract.must) || REQUIRED_MUST.some((m) => !contract.must.includes(m))) {
    throw new ExecutorContractError('must obligations are incomplete', { must: contract.must, required: REQUIRED_MUST });
  }
  if (!Array.isArray(contract.must_not) || REQUIRED_MUST_NOT.some((m) => !contract.must_not.includes(m))) {
    throw new ExecutorContractError('must_not prohibitions are incomplete', { must_not: contract.must_not, required: REQUIRED_MUST_NOT });
  }

  const overlap = contract.must.filter((m) => contract.must_not.includes(m));
  if (overlap.length > 0) {
    throw new ExecutorContractError(`Contract cannot both require and prohibit: ${overlap.join(', ')}`, { overlap });
  }

  return true;
}

// Prove that an execution receipt is well-formed, identity-preserving, scope-conformant,
// and evidenced against a given plan. This is structural acceptance only — it proves the
// executor reported execution under the right identity, within declared scope, with
// required evidence references. It does NOT and cannot prove semantic correctness of
// the outcome: receipt acceptance is not outcome verification.
export function validateExecutionReceiptAgainstPlan(plan, receipt) {
  if (!plan || typeof plan !== 'object' || Array.isArray(plan)) {
    throw new ExecutorContractError('plan must be a plain object', { received: typeof plan });
  }
  if (!receipt || typeof receipt !== 'object' || Array.isArray(receipt)) {
    throw new ExecutorContractError('receipt must be a plain object', { received: typeof receipt });
  }

  const unknown = Object.keys(receipt).filter((k) => !RECEIPT_FIELDS.includes(k));
  if (unknown.length > 0) {
    throw new ExecutorContractError(`Unknown execution receipt fields: ${unknown.join(', ')}`, { unknown });
  }

  if (receipt.receipt_type !== 'EXECUTION_RECEIPT') {
    throw new ExecutorContractError(`Unknown receipt_type: ${receipt.receipt_type}`, { receipt_type: receipt.receipt_type });
  }

  if (receipt.operation_id !== plan.identity.operation_id) {
    throw new ExecutorContractError('Receipt operation_id does not match plan identity', {
      expected: plan.identity.operation_id,
      received: receipt.operation_id,
    });
  }
  if (receipt.correlation_id !== plan.identity.correlation_id) {
    throw new ExecutorContractError('Receipt correlation_id does not match plan identity', {
      expected: plan.identity.correlation_id,
      received: receipt.correlation_id,
    });
  }

  if (!Array.isArray(receipt.phases_executed)) {
    throw new ExecutorContractError('receipt.phases_executed must be an array');
  }
  const knownPhaseIds = plan.phases.map((p) => p.id);
  const unknownPhases = receipt.phases_executed.filter((id) => !knownPhaseIds.includes(id));
  if (unknownPhases.length > 0) {
    throw new ExecutorContractError(`Receipt references phases not present in the plan: ${unknownPhases.join(', ')}`, { unknownPhases });
  }

  if (!Array.isArray(receipt.scope_touched)) {
    throw new ExecutorContractError('receipt.scope_touched must be an array');
  }
  const outOfScope = receipt.scope_touched.filter((r) => !plan.scope.resources.includes(r));
  if (outOfScope.length > 0) {
    throw new ExecutorContractError(`Receipt reports resources outside plan scope: ${outOfScope.join(', ')}`, { outOfScope });
  }

  if (!Array.isArray(receipt.evidence_references) || receipt.evidence_references.length === 0) {
    throw new ExecutorContractError('receipt.evidence_references must be a non-empty array');
  }
  const missingEvidence = plan.evidence.requirements.filter(
    (req) => !receipt.evidence_references.some((ref) => ref && ref.type === req),
  );
  if (missingEvidence.length > 0) {
    throw new ExecutorContractError(`Receipt is missing required evidence references: ${missingEvidence.join(', ')}`, { missingEvidence });
  }

  // Deliberately narrow return shape: structural acceptance facts only. No field
  // here asserts or implies semantic correctness of the executed outcome.
  return Object.freeze({
    receipt_accepted: true,
    operation_identity_preserved: true,
    scope_conformant: true,
    evidence_references_present: true,
  });
}
