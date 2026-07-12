// SELF Protocol Core v0 — pure constructors and validators for continuity
// primitives: lease, interruption, handoff, recovery.
// No persistence, networking, scheduling, or process control lives here.

import { buildPacket } from './packets.js';

export function createLeaseRecord(fields) {
  return buildPacket('LeaseRecord', fields, {
    requiredPayload: ['leased_ref', 'executor_id', 'expires_at', 'revocation_condition'],
    nullablePayload: ['revocation_condition'],
    nullableEnvelope: ['provenance'],
  });
}

export function createInterruptionPacket(fields) {
  return buildPacket('InterruptionPacket', fields, {
    requiredPayload: ['interruption_reason', 'last_verified_event', 'unverified_actions'],
  });
}

export function createRecoveryPacket(fields) {
  return buildPacket('RecoveryPacket', fields, {
    requiredPayload: [
      'last_verified_event',
      'interruption_reason',
      'safe_resume_point',
      'candidate_executors',
    ],
    nullablePayload: ['safe_resume_point'],
  });
}

export function createHandoffPacket(fields) {
  return buildPacket('HandoffPacket', fields, {
    requiredPayload: ['from_executor', 'to_executor', 'handoff_reason', 'mission_state_ref'],
    nullablePayload: ['from_executor'],
  });
}
