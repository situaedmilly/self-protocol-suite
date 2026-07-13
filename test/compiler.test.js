// test/compiler.test.js
// SELF Compiler Boundary v0 — chamber fixture, determinism, and constitutional
// law tests for compileIRToExecutionPlan.

import test from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { compileInstructionToIR } from '../src/ir.js';
import { compileIRToExecutionPlan } from '../src/compiler.js';
import { EXECUTION_PLAN_VERSION, TERMINAL_PLAN_ACTIONS } from '../src/execution-plan.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Chamber fixture: the already-proven command-route persistence seam,
// expressed in SELF IR's closed vocabulary. ──
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

function chamberIR() {
  return compileInstructionToIR(COMMAND_ROUTE_PERSISTENCE_GUARD_INSTRUCTION);
}

test('compiler: chamber fixture compiles to a valid, normalized execution plan', (t) => {
  const ir = chamberIR();
  const plan = compileIRToExecutionPlan(ir);
  assert.strictEqual(plan.plan_type, 'SELF_EXECUTION_PLAN');
  assert.strictEqual(plan.plan_version, EXECUTION_PLAN_VERSION);
  assert(Object.isFrozen(plan));
});

test('compiler: identical IR compiles to identical plan (determinism)', (t) => {
  const ir = chamberIR();
  const plan1 = compileIRToExecutionPlan(ir);
  const plan2 = compileIRToExecutionPlan(ir);
  assert.deepStrictEqual(plan1, plan2);
  assert.strictEqual(JSON.stringify(plan1), JSON.stringify(plan2));

  // Recompiling from a freshly-built IR (not the same object reference) must
  // still produce byte-identical output — the compiler is a pure function of
  // canonical IR content, not of any incidental object identity.
  const plan3 = compileIRToExecutionPlan(chamberIR());
  assert.strictEqual(JSON.stringify(plan1), JSON.stringify(plan3));
});

test('compiler: authority never widens beyond the IR', (t) => {
  const ir = chamberIR();
  const plan = compileIRToExecutionPlan(ir);
  for (const action of plan.authority.allowed) {
    assert(ir.Authority.allowed.includes(action), `${action} must already be present in IR authority.allowed`);
  }
});

test('compiler: scope never widens beyond the IR mutation scope', (t) => {
  const ir = chamberIR();
  const plan = compileIRToExecutionPlan(ir);
  const irFiles = [...ir.Constraints.mutation_scope.files].sort();
  assert.deepStrictEqual([...plan.scope.resources].sort(), irFiles);
  assert.deepStrictEqual([...plan.scope.mutation_targets].sort(), irFiles);
});

test('compiler: every IR evidence requirement survives into the plan', (t) => {
  const ir = chamberIR();
  const plan = compileIRToExecutionPlan(ir);
  for (const req of ir.Evidence.required) {
    assert(plan.evidence.requirements.includes(req), `${req} must survive compilation`);
  }
});

test('compiler: continuation order is preserved verbatim', (t) => {
  const ir = chamberIR();
  const plan = compileIRToExecutionPlan(ir);
  assert.deepStrictEqual(plan.continuation.success, ir.Continuation.on_success);
});

test('compiler: no terminal action ever appears in an executable phase', (t) => {
  const ir = chamberIR();
  const plan = compileIRToExecutionPlan(ir);
  for (const phase of plan.phases) {
    assert(!TERMINAL_PLAN_ACTIONS.includes(phase.operation), `${phase.operation} must not be an executable phase`);
  }
});

test('compiler: phase dependency chain is well-formed and forward-only', (t) => {
  const ir = chamberIR();
  const plan = compileIRToExecutionPlan(ir);
  const seenIds = new Set();
  for (const phase of plan.phases) {
    for (const dep of phase.depends_on) {
      assert(seenIds.has(dep), `${phase.id} must only depend on an already-declared phase`);
    }
    seenIds.add(phase.id);
  }
});

test('compiler: the module exposes no execute, run, or dispatch surface', async (t) => {
  const mod = await import('../src/compiler.js');
  const forbiddenNamePattern = /execute|dispatch|invoke|^run/i;
  const offending = Object.keys(mod).filter((k) => forbiddenNamePattern.test(k));
  assert.deepStrictEqual(offending, []);
});

test('rejection: IR with MERGE_MAIN in Authority.allowed is refused', (t) => {
  const bad = rawIRWithAllowed(['MERGE_MAIN']);
  assert.throws(() => compileIRToExecutionPlan(bad));
});

test('rejection: IR with DEPLOY in Authority.allowed is refused', (t) => {
  const bad = rawIRWithAllowed(['DEPLOY']);
  assert.throws(() => compileIRToExecutionPlan(bad));
});

test('rejection: IR with RATIFY in Authority.allowed is refused', (t) => {
  const bad = rawIRWithAllowed(['RATIFY']);
  assert.throws(() => compileIRToExecutionPlan(bad));
});

test('rejection: IR with PROMOTE in Authority.allowed is refused', (t) => {
  const bad = rawIRWithAllowed(['PROMOTE']);
  assert.throws(() => compileIRToExecutionPlan(bad));
});

test('rejection: a non-object IR is refused', (t) => {
  assert.throws(() => compileIRToExecutionPlan(null));
  assert.throws(() => compileIRToExecutionPlan('IMPLEMENT'));
  assert.throws(() => compileIRToExecutionPlan([]));
});

function rawIRWithAllowed(extraAllowed) {
  return {
    ir_type: 'SELF_OPERATION',
    ir_version: 'v0',
    Operation: { verb: 'IMPLEMENT', mode: 'SINGLE_SEAM' },
    Subject: { kind: 'CommandRoutePersistenceGuard', target: 'Kernel', source: 'ProtocolCore' },
    Authority: { class: 'BOUNDED_MUTATION', allowed: extraAllowed, denied: [] },
    Constraints: {
      mutation_scope: { files: ['persistence/pending-proposals.js'] },
      preserve: [],
      stop_on: [],
    },
    Evidence: {
      required: ['PROTOCOL_SUITE'],
      acceptance: { zero_failures: true, zero_divergences: true },
    },
    Continuation: { on_success: [], on_failure: ['STOP'], terminal_before: [] },
  };
}

test('provider neutrality and purity: no provider names, clock, randomness, filesystem, or network usage in production files', (t) => {
  const productionFiles = ['compiler.js', 'execution-plan.js', 'executor-contract.js', 'index.js'];

  const forbiddenProviderTokens = [
    'Claude', 'Anthropic', 'OpenAI', 'ChatGPT', 'Codex', 'Gemini',
    'GitHub', 'GitLab', 'MCP', 'npm', 'shell', 'bash', 'REST', 'HTTP',
  ];
  const forbiddenRuntimeTokens = [
    'Date.now', 'Math.random', 'new Date(',
    'readFileSync', 'writeFileSync', 'readFile(', 'writeFile(',
    "from 'fs'", 'from "fs"', "require('fs')", 'require("fs")',
    'fetch(', 'XMLHttpRequest', 'node:http', 'node:net', 'node:child_process',
    'process.env',
  ];

  for (const file of productionFiles) {
    const text = readFileSync(path.join(__dirname, '..', 'src', file), 'utf8');
    for (const token of forbiddenProviderTokens) {
      assert(!text.includes(token), `${file} must not reference provider/tooling token: ${token}`);
    }
    for (const token of forbiddenRuntimeTokens) {
      assert(!text.includes(token), `${file} must not use forbidden runtime token: ${token}`);
    }
  }
});
