// test/ir.test.js
// SELF IR Core v0 chamber fixture and validation tests.

import test from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import {
  IR_VERSION,
  OPERATION_VERBS,
  AUTHORITY_ACTIONS,
  TERMINAL_ACTIONS,
  PRESERVED_INVARIANTS,
  STOP_CONDITIONS,
  EVIDENCE_TYPES,
  validateSelfIR,
  normalizeSelfIR,
  compileInstructionToIR,
} from '../src/ir.js';

// ── Chamber Test 0 Fixture: Canonical Serialization Adapter ──
// This is the proven adoption seam, compiled into SELF IR.
const CANONICAL_SERIALIZATION_INSTRUCTION = {
  verb: 'IMPLEMENT',
  subject: 'CanonicalSerializationAdapter',
  target: 'Kernel',
  source: 'ProtocolCore',
  authorityClass: 'BOUNDED_MUTATION',
  preserve: ['KernelAPI', 'HistoricalHashes', 'SealedConsumers'],
  files: [
    'persistence/canonical-json.js',
    'test/canonical-json.test.js',
  ],
  evidence: [
    'DIFFERENTIAL_TESTS',
    'FULL_CONSUMER_SUITE',
    'PROTOCOL_SUITE',
    'STATIC_DEPENDENCY_CHECK',
  ],
  deliver: ['COMMIT', 'PUSH_BRANCH', 'OPEN_DRAFT_PR'],
  stopBefore: ['MERGE_MAIN'],
};

test('IR: chamber fixture compiles without error', (t) => {
  const ir = compileInstructionToIR(CANONICAL_SERIALIZATION_INSTRUCTION);
  assert(ir, 'compiled IR exists');
  assert.strictEqual(ir.ir_version, 'v0');
  assert.strictEqual(ir.ir_type, 'SELF_OPERATION');
});

test('IR: chamber fixture normalizes deterministically', (t) => {
  const ir1 = compileInstructionToIR(CANONICAL_SERIALIZATION_INSTRUCTION);
  const ir2 = compileInstructionToIR(CANONICAL_SERIALIZATION_INSTRUCTION);
  
  assert.deepStrictEqual(ir1, ir2, 'identical instructions produce identical IR');
  
  // Verify JSON serialization is identical.
  const json1 = JSON.stringify(ir1);
  const json2 = JSON.stringify(ir2);
  assert.strictEqual(json1, json2, 'normalized JSON is identical');
});

test('IR: chamber fixture is deeply immutable', (t) => {
  const ir = compileInstructionToIR(CANONICAL_SERIALIZATION_INSTRUCTION);
  
  assert.throws(() => {
    ir.Operation.verb = 'AUDIT';
  }, 'cannot mutate Operation');
  
  assert.throws(() => {
    ir.Authority.allowed.push('DEPLOY');
  }, 'cannot mutate allowed array');
  
  assert.throws(() => {
    ir.Constraints.preserve.push('UnknownInvariant');
  }, 'cannot mutate preserve set');
});

test('IR: chamber fixture continuation order is preserved', (t) => {
  const ir = compileInstructionToIR(CANONICAL_SERIALIZATION_INSTRUCTION);
  
  assert.deepStrictEqual(
    ir.Continuation.on_success,
    ['COMMIT', 'PUSH_BRANCH', 'OPEN_DRAFT_PR'],
    'on_success steps are in order'
  );
  
  assert.deepStrictEqual(
    ir.Continuation.on_failure,
    ['STOP'],
    'on_failure always ends with STOP'
  );
});

// ── Authority Safety ──

test('IR: reject MERGE_MAIN in allowed (v0 forbids terminal actions)', (t) => {
  const instruction = {
    ...CANONICAL_SERIALIZATION_INSTRUCTION,
    authorityClass: 'BOUNDED_MUTATION',
  };
  
  const ir = compileInstructionToIR(instruction);
  assert(!ir.Authority.allowed.includes('MERGE_MAIN'), 'MERGE_MAIN not in allowed');
  assert(ir.Authority.denied.includes('MERGE_MAIN'), 'MERGE_MAIN in denied');
});

test('IR: reject continuation that violates denied authority', (t) => {
  const instruction = {
    ...CANONICAL_SERIALIZATION_INSTRUCTION,
    deliver: ['COMMIT', 'DEPLOY'], // DEPLOY is denied
  };
  
  assert.throws(
    () => compileInstructionToIR(instruction),
    /Continuation requests denied actions/,
    'rejects continuation with denied action'
  );
});

test('IR: reject allowed/denied overlap', (t) => {
  const badIR = {
    ir_type: 'SELF_OPERATION',
    ir_version: 'v0',
    Operation: { verb: 'IMPLEMENT', mode: 'SINGLE_SEAM' },
    Subject: { kind: 'Test', target: 'Kernel', source: 'ProtocolCore' },
    Authority: {
      class: 'BOUNDED_MUTATION',
      allowed: ['COMMIT', 'DEPLOY'], // DEPLOY is both allowed and denied
      denied: ['DEPLOY'],
    },
    Constraints: { preserve: [], mutation_scope: { files: ['test.js'] }, stop_on: [] },
    Evidence: { required: ['FULL_CONSUMER_SUITE'], acceptance: { zero_failures: true, zero_divergences: true } },
    Continuation: { on_success: ['COMMIT'], on_failure: ['STOP'], terminal_before: ['MERGE_MAIN'] },
  };
  
  assert.throws(
    () => validateSelfIR(badIR),
    /Authority overlap/,
    'rejects allowed/denied overlap'
  );
});

// ── Scope Safety ──

test('IR: reject mutation operation without authorized files', (t) => {
  const instruction = {
    ...CANONICAL_SERIALIZATION_INSTRUCTION,
    files: undefined, // Missing files for mutation
  };
  
  assert.throws(
    () => compileInstructionToIR(instruction),
    /mutation_scope.files required/,
    'rejects mutation without files'
  );
});

test('IR: reject unknown preserve invariant', (t) => {
  const instruction = {
    ...CANONICAL_SERIALIZATION_INSTRUCTION,
    preserve: ['KernelAPI', 'UnknownInvariant'],
  };
  
  assert.throws(
    () => compileInstructionToIR(instruction),
    /Unknown preserve invariants/,
    'rejects unknown invariant'
  );
});

test('IR: reject unknown evidence type', (t) => {
  const instruction = {
    ...CANONICAL_SERIALIZATION_INSTRUCTION,
    evidence: ['FULL_CONSUMER_SUITE', 'UNKNOWN_EVIDENCE'],
  };
  
  assert.throws(
    () => compileInstructionToIR(instruction),
    /Unknown evidence types/,
    'rejects unknown evidence type'
  );
});

test('IR: reject empty evidence required', (t) => {
  const badIR = {
    ir_type: 'SELF_OPERATION',
    ir_version: 'v0',
    Operation: { verb: 'IMPLEMENT', mode: 'SINGLE_SEAM' },
    Subject: { kind: 'Test', target: 'Kernel', source: 'ProtocolCore' },
    Authority: { class: 'BOUNDED_MUTATION', allowed: ['COMMIT'], denied: ['MERGE_MAIN'] },
    Constraints: { preserve: [], mutation_scope: { files: ['test.js'] }, stop_on: [] },
    Evidence: { required: [], acceptance: { zero_failures: true, zero_divergences: true } }, // Empty
    Continuation: { on_success: ['COMMIT'], on_failure: ['STOP'], terminal_before: ['MERGE_MAIN'] },
  };
  
  assert.throws(
    () => validateSelfIR(badIR),
    /Evidence.required must be a non-empty array/,
    'rejects empty evidence'
  );
});

test('IR: reject failure path without STOP', (t) => {
  const badIR = {
    ir_type: 'SELF_OPERATION',
    ir_version: 'v0',
    Operation: { verb: 'IMPLEMENT', mode: 'SINGLE_SEAM' },
    Subject: { kind: 'Test', target: 'Kernel', source: 'ProtocolCore' },
    Authority: { class: 'BOUNDED_MUTATION', allowed: ['COMMIT'], denied: ['MERGE_MAIN'] },
    Constraints: { preserve: [], mutation_scope: { files: ['test.js'] }, stop_on: [] },
    Evidence: { required: ['FULL_CONSUMER_SUITE'], acceptance: { zero_failures: true, zero_divergences: true } },
    Continuation: { on_success: ['COMMIT'], on_failure: ['LOG_ERROR'], terminal_before: ['MERGE_MAIN'] }, // No STOP
  };
  
  assert.throws(
    () => validateSelfIR(badIR),
    /must end with STOP/,
    'rejects failure path without STOP'
  );
});

test('IR: reject unknown top-level fields', (t) => {
  const mangled = JSON.parse(JSON.stringify(compileInstructionToIR(CANONICAL_SERIALIZATION_INSTRUCTION)));
  mangled.unknownField = 'should fail';
  
  assert.throws(
    () => validateSelfIR(mangled),
    /Unknown IR fields/,
    'rejects unknown top-level fields'
  );
});

// ── Provider Neutrality ──

test('IR: implementation contains no provider tool references', (t) => {
  const srcPath = new URL('../src/ir.js', import.meta.url);
  const src = readFileSync(srcPath, 'utf8');
  
  // The IR must not import or reference tools/providers directly.
  // Abstract action names (COMMIT, PUSH_BRANCH) are OK; tool names are not.
  assert(!src.includes('child_process'), 'no shell/child_process');
  assert(!src.includes('fetch('), 'no direct HTTP');
});

// ── Constants Export ──

test('IR: exports canonical constants', (t) => {
  assert(Array.isArray(OPERATION_VERBS), 'OPERATION_VERBS exported');
  assert(Array.isArray(AUTHORITY_ACTIONS), 'AUTHORITY_ACTIONS exported');
  assert(Array.isArray(TERMINAL_ACTIONS), 'TERMINAL_ACTIONS exported');
  assert(Array.isArray(PRESERVED_INVARIANTS), 'PRESERVED_INVARIANTS exported');
  assert(Array.isArray(STOP_CONDITIONS), 'STOP_CONDITIONS exported');
  assert(Array.isArray(EVIDENCE_TYPES), 'EVIDENCE_TYPES exported');
  assert.strictEqual(IR_VERSION, 'v0', 'IR_VERSION is v0');
});

test('IR: TERMINAL_ACTIONS are always denied in v0', (t) => {
  for (const action of TERMINAL_ACTIONS) {
    assert(!AUTHORITY_ACTIONS.includes(action) || action === 'MERGE_MAIN',
      `${action} should not be freely authorizable in v0`);
  }
});
