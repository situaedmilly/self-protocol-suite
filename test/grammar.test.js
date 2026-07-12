import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseInstruction, isLegalCombination } from '../src/grammar.js';
import { ProtocolGrammarError } from '../src/errors.js';

test('valid instruction parses', () => {
  const instruction = parseInstruction('DECLARE MISSION');
  assert.equal(instruction.verb, 'DECLARE');
  assert.equal(instruction.subject, 'MISSION');
  assert.equal(instruction.object, null);
  assert.equal(instruction.authority_ref, null);
  assert.equal(instruction.expected_output, null);
});

test('valid instruction with optional clauses parses', () => {
  const instruction = parseInstruction(
    'EXECUTE TASK WITH CAPABILITY UNDER AUTHORITY EXPECTING RECEIPT',
  );
  assert.equal(instruction.verb, 'EXECUTE');
  assert.equal(instruction.subject, 'TASK');
  assert.equal(instruction.object, 'CAPABILITY');
  assert.equal(instruction.authority_ref, 'AUTHORITY');
  assert.equal(instruction.expected_output, 'RECEIPT');
});

test('parser never executes — returns a plain frozen structure only', () => {
  const instruction = parseInstruction('COMMIT LEDGER_ENTRY');
  assert.ok(Object.isFrozen(instruction));
  assert.deepEqual(Object.keys(instruction).sort(), [
    'authority_ref',
    'expected_output',
    'object',
    'subject',
    'verb',
  ]);
});

test('invalid verb/subject pair fails', () => {
  assert.throws(() => parseInstruction('DECLARE RECEIPT'), ProtocolGrammarError);
});

test('unknown verb fails', () => {
  assert.throws(() => parseInstruction('FABRICATE MISSION'), ProtocolGrammarError);
});

test('unknown subject fails', () => {
  assert.throws(() => parseInstruction('DECLARE SPACESHIP'), ProtocolGrammarError);
});

test('malformed sentence fails', () => {
  assert.throws(() => parseInstruction('DECLARE'), ProtocolGrammarError);
  assert.throws(() => parseInstruction(''), ProtocolGrammarError);
});

test('isLegalCombination reports without throwing', () => {
  assert.equal(isLegalCombination('DECLARE', 'MISSION'), true);
  assert.equal(isLegalCombination('DECLARE', 'RECEIPT'), false);
});
