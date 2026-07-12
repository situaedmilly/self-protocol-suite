// SELF Protocol Core v0 — typed error hierarchy.
// Every failure mode in the protocol core fails closed through one of these.

export class ProtocolError extends Error {
  constructor(message, { code, details } = {}) {
    super(message);
    this.name = this.constructor.name;
    this.code = code || 'PROTOCOL_ERROR';
    this.details = details || null;
  }
}

export class ProtocolDuplicatePrimitiveError extends ProtocolError {
  constructor(message, details) {
    super(message, { code: 'PROTOCOL_DUPLICATE_PRIMITIVE', details });
  }
}

export class ProtocolTypeError extends ProtocolError {
  constructor(message, details) {
    super(message, { code: 'PROTOCOL_TYPE_ERROR', details });
  }
}

export class ProtocolGrammarError extends ProtocolError {
  constructor(message, details) {
    super(message, { code: 'PROTOCOL_GRAMMAR_ERROR', details });
  }
}

export class ProtocolStateError extends ProtocolError {
  constructor(message, details) {
    super(message, { code: 'PROTOCOL_STATE_ERROR', details });
  }
}

export class ProtocolAuthorityError extends ProtocolError {
  constructor(message, details) {
    super(message, { code: 'PROTOCOL_AUTHORITY_ERROR', details });
  }
}

export class ProtocolEvidenceError extends ProtocolError {
  constructor(message, details) {
    super(message, { code: 'PROTOCOL_EVIDENCE_ERROR', details });
  }
}
