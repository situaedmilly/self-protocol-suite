// SELF Protocol Core v0 — authority validation only. This module never
// mints authority, infers consent, promotes a record, or approves evidence.

import { ProtocolAuthorityError, ProtocolTypeError } from './errors.js';

// Frozen constant: every module in this package reports the same
// never-crossed Promotion Boundary. No function anywhere may change this.
export const PROMOTION_BOUNDARY = Object.freeze({
  status: 'NOT_CROSSED',
  validator_authority: 'NONE',
});

export function validateAuthorityEnvelopeStructure(envelope) {
  if (envelope === null || typeof envelope !== 'object') {
    throw new ProtocolTypeError('Authority envelope must be a plain object');
  }
  if (typeof envelope.granted_by !== 'string' || envelope.granted_by.length === 0) {
    throw new ProtocolAuthorityError('Authority envelope missing granted_by — authority cannot self-mint', {
      envelope,
    });
  }
  if (typeof envelope.authority_ceiling !== 'string' || envelope.authority_ceiling.length === 0) {
    throw new ProtocolAuthorityError('Authority envelope missing authority_ceiling', { envelope });
  }
  if (!Array.isArray(envelope.prohibited_actions)) {
    throw new ProtocolAuthorityError('Authority envelope missing prohibited_actions array', {
      envelope,
    });
  }
  return true;
}

// Ceiling comparison only — this never grants new authority, it only
// reports whether an already-issued envelope covers a requested operation.
export function checkAuthorityCeiling(envelope, requestedOperation) {
  validateAuthorityEnvelopeStructure(envelope);
  if (typeof requestedOperation !== 'string' || requestedOperation.length === 0) {
    throw new ProtocolTypeError('requestedOperation must be a non-empty string');
  }
  if (envelope.prohibited_actions.includes(requestedOperation)) {
    throw new ProtocolAuthorityError(
      `Operation is explicitly prohibited by authority envelope: ${requestedOperation}`,
      { requestedOperation, envelope },
    );
  }
  if (envelope.authority_ceiling !== requestedOperation && envelope.authority_ceiling !== 'ALL') {
    throw new ProtocolAuthorityError(
      `Insufficient authority: ceiling "${envelope.authority_ceiling}" does not cover "${requestedOperation}"`,
      { requestedOperation, envelope },
    );
  }
  return true;
}

// The protocol core cannot mint authority for itself. Any attempt to
// construct an envelope without a human-traceable granted_by fails closed.
export function assertNoAuthorityMinting(envelope) {
  if (!envelope || envelope.granted_by === 'SELF' || envelope.granted_by === envelope.id) {
    throw new ProtocolAuthorityError('Protocol core may not mint its own authority', { envelope });
  }
  return true;
}

// Reports that human authorization is required; performs no authorization
// itself and never approves evidence or promotes a record.
export function requireHumanAuthorization(reason) {
  return Object.freeze({
    authority_required: true,
    reason: reason || 'Requested operation requires explicit human authorization.',
    promotion_boundary: PROMOTION_BOUNDARY,
  });
}
