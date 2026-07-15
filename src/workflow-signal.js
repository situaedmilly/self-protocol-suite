// WORKFLOWEXECUTION_SIGNAL v1
// Exact-marker resolver. No semantic inference, no authority widening.

export const WORKFLOW_SIGNAL_VERSION = 'v1';

export const SIGNAL_PRIORITY = Object.freeze({
  STOP_SIGNAL: 100,
  AUTHORITY_SIGNAL: 90,
  OPERATING_SIGNAL: 80,
  OBJECTIVE_SIGNAL: 70,
  INSPECTION_SIGNAL: 60,
  MUTATION_SIGNAL: 50,
  VERIFICATION_SIGNAL: 40,
  SEAL_SIGNAL: 30,
  FOUNDATION_SIGNAL: 10,
});

const SIGNAL_PATTERN = /\b([A-Z][A-Z0-9_]*_SIGNAL)\b/g;

export class WorkflowSignalError extends Error {
  constructor(code, message, context = {}) {
    super(message);
    this.name = 'WorkflowSignalError';
    this.code = code;
    this.context = Object.freeze({ ...context });
  }
}

export function detectWorkflowSignals(prompt) {
  if (typeof prompt !== 'string') {
    throw new WorkflowSignalError('INVALID_PROMPT', 'Prompt must be a string');
  }

  const discovered = [...new Set(prompt.match(SIGNAL_PATTERN) || [])].sort();
  const unknown = discovered.filter((signal) => !(signal in SIGNAL_PRIORITY));

  if (unknown.length > 0) {
    throw new WorkflowSignalError(
      'UNKNOWN_SIGNAL',
      `Unknown workflow signal(s): ${unknown.join(', ')}`,
      { unknown }
    );
  }

  if (discovered.length === 0) {
    return Object.freeze({
      version: WORKFLOW_SIGNAL_VERSION,
      state: 'UNCLASSIFIED_SIGNAL',
      controlling_signal: null,
      signals: Object.freeze([]),
    });
  }

  const ordered = [...discovered].sort(
    (a, b) => SIGNAL_PRIORITY[b] - SIGNAL_PRIORITY[a] || a.localeCompare(b)
  );

  const controlling = ordered[0];
  return Object.freeze({
    version: WORKFLOW_SIGNAL_VERSION,
    state: controlling === 'STOP_SIGNAL' ? 'STOP_SIGNAL_ACTIVE' : 'SIGNAL_RESOLVED',
    controlling_signal: controlling,
    signals: Object.freeze(ordered),
  });
}

export function requireWorkflowSignal(prompt) {
  const result = detectWorkflowSignals(prompt);
  if (result.state === 'UNCLASSIFIED_SIGNAL') {
    throw new WorkflowSignalError(
      'UNCLASSIFIED_SIGNAL',
      'No explicit WORKFLOWEXECUTION_SIGNAL marker was found. Stop before inspection.'
    );
  }
  return result;
}
