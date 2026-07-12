// SELF Protocol Core v0 — mission lifecycle state machine.
// State transition is not promotion: it never touches the Promotion Boundary.

import { ProtocolStateError } from './errors.js';

export const MISSION_STATES = Object.freeze([
  'INITIALIZED',
  'ORIENTED',
  'EXECUTING',
  'PAUSED',
  'INTERRUPTED',
  'COMPLETED',
  'FAILED',
  'SEALED',
]);

export const TERMINAL_STATES = Object.freeze(['FAILED', 'SEALED']);

// Exactly the minimum v0 mission lifecycle. No unlisted transition is legal.
const TRANSITIONS = Object.freeze({
  INITIALIZED: Object.freeze(['ORIENTED']),
  ORIENTED: Object.freeze(['EXECUTING']),
  EXECUTING: Object.freeze(['PAUSED', 'INTERRUPTED', 'COMPLETED', 'FAILED']),
  PAUSED: Object.freeze([]),
  INTERRUPTED: Object.freeze([]),
  COMPLETED: Object.freeze(['SEALED']),
  FAILED: Object.freeze([]),
  SEALED: Object.freeze([]),
});

export function isTerminalState(state) {
  return TERMINAL_STATES.includes(state);
}

export function legalNextStates(currentState) {
  if (!(currentState in TRANSITIONS)) {
    throw new ProtocolStateError(`Unknown mission state: ${currentState}`, { currentState });
  }
  return TRANSITIONS[currentState];
}

export function transitionMission(currentState, nextState) {
  if (!(currentState in TRANSITIONS)) {
    throw new ProtocolStateError(`Unknown mission state: ${currentState}`, { currentState });
  }
  if (!MISSION_STATES.includes(nextState)) {
    throw new ProtocolStateError(`Unknown target state: ${nextState}`, { nextState });
  }
  if (isTerminalState(currentState)) {
    throw new ProtocolStateError(`Cannot transition out of terminal state: ${currentState}`, {
      currentState,
      nextState,
    });
  }
  const legal = TRANSITIONS[currentState];
  if (!legal.includes(nextState)) {
    throw new ProtocolStateError(`Illegal transition: ${currentState} -> ${nextState}`, {
      currentState,
      nextState,
      legalNextStates: legal,
    });
  }
  return nextState;
}
