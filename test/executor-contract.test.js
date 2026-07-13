// test/executor-contract.test.js
// SELF Compiler Boundary v0 — abstract executor contract and receipt boundary tests.

import test from 'node:test';
import assert from 'node:assert';
import { compileInstructionToIR } from '../src/ir.js';
import { compileIRToExecutionPlan } from '../src/compiler.js';
import {
  EXECUTOR_CONTRACT_VERSION,
  validateExecutorContract,
  validateExecutionReceiptAgainstPlan,
} from '../src/executor-contract.js';

const COMMAND_ROUTE_PERSISTENCE_GUARD_INSTRUCTION = {
  verb: 'IMPLEMENT',
  subject: 'CommandRoutePersistenceGuard',
  target: 'Kernel',
  source: 'ProtocolCore',
  authorityClass: 'BOUNDED_MUTATION',
  preserve: ['KernelAPI'],
  files: [
    'persistence/pending-proposals.js',
    'test/pending-proposals.test.js',
  ],
  evidence: ['DIFFERENTIAL_TESTS', 'FULL_CONSUMER_SUITE', 'PROTOCOL_SUITE'],
  deliver: ['COMMIT', 'PUSH_BRANCH', 'OPEN_DRAFT_PR'],
  stopBefore: ['MERGE_MAIN'],
};

function chamberPlan() {
  const ir = compileInstructionToIR(COMMAND_ROUTE_PERSISTENCE_GUARD_INSTRUCTION);
  return compileIRToExecutionPlan(ir);
}

function validContract(overrides = {}) {
  return {
    executor_contract_version: EXECUTOR_CONTRACT_VERSION,
    accepts: ['SELF_EXECUTION_PLAN'],
    returns: ['EXECUTION_RECEIPT', 'EVIDENCE_PACKET'],
    must: [
      'preserve_operation_identity',
      'preserve_authority_ceiling',
      'remain_within_scope',
      'emit_required_evidence',
      'terminate_on_stop_condition',
    ],
    must_not: [
      'infer_authority',
      'widen_scope',
      'rewrite_plan_semantics',
      'claim_semantic_success_from_process_success',
      'continue_after_terminal_boundary',
    ],
    ...overrides,
  };
}

function validReceipt(plan, overrides = {}) {
  return {
    receipt_type: 'EXECUTION_RECEIPT',
    operation_id: plan.identity.operation_id,
    correlation_id: plan.identity.correlation_id,
    phases_executed: plan.phases.map((p) => p.id),
    scope_touched: [...plan.scope.resources],
    evidence_references: plan.evidence.requirements.map((type) => ({ type, digest: 'placeholder' })),
    ...overrides,
  };
}

test('executor-contract: a fully-obligated abstract contract validates', (t) => {
  assert.strictEqual(validateExecutorContract(validContract()), true);
});

test('rejection: a contract missing a required "must" obligation is refused', (t) => {
  const contract = validContract({ must: ['preserve_operation_identity'] });
  assert.throws(() => validateExecutorContract(contract));
});

test('rejection: a contract missing a required "must_not" prohibition is refused', (t) => {
  const contract = validContract({ must_not: ['infer_authority'] });
  assert.throws(() => validateExecutorContract(contract));
});

test('rejection: a contract that both requires and prohibits the same behavior is refused', (t) => {
  const contract = validContract({
    must: [...validContract().must, 'infer_authority'],
    must_not: [...validContract().must_not, 'infer_authority'],
  });
  assert.throws(() => validateExecutorContract(contract));
});

test('rejection: a contract accepting anything beyond SELF_EXECUTION_PLAN is refused', (t) => {
  const contract = validContract({ accepts: ['SELF_EXECUTION_PLAN', 'RAW_PROSE_INSTRUCTION'] });
  assert.throws(() => validateExecutorContract(contract));
});

test('executor-contract: a well-formed receipt validates against its plan', (t) => {
  const plan = chamberPlan();
  const receipt = validReceipt(plan);
  const result = validateExecutionReceiptAgainstPlan(plan, receipt);
  assert.strictEqual(result.receipt_accepted, true);
  assert(Object.isFrozen(result));
});

test('rejection: a receipt with a mismatched operation_id is refused', (t) => {
  const plan = chamberPlan();
  const receipt = validReceipt(plan, { operation_id: 'not-the-plan-operation-id' });
  assert.throws(() => validateExecutionReceiptAgainstPlan(plan, receipt));
});

test('rejection: a receipt reporting phases outside the plan is refused', (t) => {
  const plan = chamberPlan();
  const receipt = validReceipt(plan, { phases_executed: [...plan.phases.map((p) => p.id), 'phase-invented'] });
  assert.throws(() => validateExecutionReceiptAgainstPlan(plan, receipt));
});

test('rejection: a receipt reporting scope outside the plan is refused', (t) => {
  const plan = chamberPlan();
  const receipt = validReceipt(plan, { scope_touched: [...plan.scope.resources, 'persistence/unauthorized-file.js'] });
  assert.throws(() => validateExecutionReceiptAgainstPlan(plan, receipt));
});

test('rejection: a receipt missing required evidence references is refused', (t) => {
  const plan = chamberPlan();
  const receipt = validReceipt(plan, { evidence_references: [] });
  assert.throws(() => validateExecutionReceiptAgainstPlan(plan, receipt));
});

test('receipt boundary: acceptance never claims semantic correctness, even if the receipt asserts it', (t) => {
  const plan = chamberPlan();
  // An executor claiming semantic success is exactly what the doctrine forbids
  // accepting at face value — the receipt shape itself has no field for it, so
  // even a lying executor cannot smuggle the claim through this contract.
  const receipt = validReceipt(plan);
  receipt.semantic_outcome = 'VERIFIED_CORRECT'; // not a permitted receipt field
  assert.throws(() => validateExecutionReceiptAgainstPlan(plan, receipt));

  const acceptedReceipt = validReceipt(plan);
  const result = validateExecutionReceiptAgainstPlan(plan, acceptedReceipt);
  const resultFields = Object.keys(result);
  assert(!resultFields.some((f) => /semantic/i.test(f) && !/present$/i.test(f)),
    'result must not carry a field asserting semantic correctness');
  assert.strictEqual(result.semantically_verified, undefined);
});
