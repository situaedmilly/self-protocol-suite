// SELF Protocol Core v0 — grammar parser.
// Form: VERB SUBJECT [WITH OBJECT] [UNDER AUTHORITY] [EXPECTING OUTPUT]
// The parser returns a structured instruction object. It never executes it.

import { isPrimitiveVerb, isPrimitiveNoun } from './primitives.js';
import { ProtocolGrammarError } from './errors.js';

// verb -> set of legal subjects. Composition law, not implementation.
const ALLOWED_COMBINATIONS = Object.freeze({
  DECLARE: Object.freeze(['MISSION']),
  REQUEST: Object.freeze(['CAPABILITY']),
  LEASE: Object.freeze(['EXECUTOR']),
  EXECUTE: Object.freeze(['TASK', 'MISSION']),
  OBSERVE: Object.freeze(['EVIDENCE']),
  VERIFY: Object.freeze(['EVIDENCE', 'RECEIPT']),
  COMMIT: Object.freeze(['LEDGER_ENTRY']),
  EMIT: Object.freeze(['RECEIPT', 'EVIDENCE']),
  TRANSFER: Object.freeze(['HANDOFF']),
  ESCALATE: Object.freeze(['AUTHORITY']),
  REVOKE: Object.freeze(['AUTHORITY', 'LEASE']),
  PAUSE: Object.freeze(['MISSION']),
  RESUME: Object.freeze(['MISSION']),
  SEAL: Object.freeze(['MISSION']),
});

const TOKEN_PATTERN =
  /^(?<verb>\S+)\s+(?<subject>\S+)(?:\s+WITH\s+(?<object>\S+))?(?:\s+UNDER\s+(?<authority>\S+))?(?:\s+EXPECTING\s+(?<output>\S+))?$/;

export function parseInstruction(sentence) {
  if (typeof sentence !== 'string' || sentence.trim().length === 0) {
    throw new ProtocolGrammarError('Instruction sentence must be a non-empty string');
  }

  const match = TOKEN_PATTERN.exec(sentence.trim());
  if (!match || !match.groups) {
    throw new ProtocolGrammarError(`Sentence does not match grammar form: "${sentence}"`, {
      sentence,
    });
  }

  const { verb, subject, object = null, authority = null, output = null } = match.groups;

  if (!isPrimitiveVerb(verb)) {
    throw new ProtocolGrammarError(`Unknown verb: ${verb}`, { verb });
  }
  if (!isPrimitiveNoun(subject)) {
    throw new ProtocolGrammarError(`Unknown subject: ${subject}`, { subject });
  }
  if (object !== null && !isPrimitiveNoun(object)) {
    throw new ProtocolGrammarError(`Unknown object: ${object}`, { object });
  }
  if (output !== null && !isPrimitiveNoun(output)) {
    throw new ProtocolGrammarError(`Unknown expected output: ${output}`, { output });
  }

  const legalSubjects = ALLOWED_COMBINATIONS[verb];
  if (!legalSubjects || !legalSubjects.includes(subject)) {
    throw new ProtocolGrammarError(`Illegal verb/subject pair: ${verb} ${subject}`, {
      verb,
      subject,
    });
  }

  return Object.freeze({
    verb,
    subject,
    object,
    authority_ref: authority,
    expected_output: output,
  });
}

export function isLegalCombination(verb, subject) {
  const legalSubjects = ALLOWED_COMBINATIONS[verb];
  return Boolean(legalSubjects && legalSubjects.includes(subject));
}

export { ALLOWED_COMBINATIONS };
