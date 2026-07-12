// SELF Protocol Core v0 — the common envelope every protocol object must expose.
// Unknown protocol types fail closed. Missing load-bearing fields fail closed.

import { isPacketType } from './primitives.js';
import { ProtocolTypeError } from './errors.js';

export const ENVELOPE_FIELDS = Object.freeze([
  'protocol_type',
  'protocol_version',
  'id',
  'mission_id',
  'producer',
  'consumer',
  'created_at',
  'timestamp_confidence',
  'authority_envelope',
  'provenance',
  'integrity_digest',
  'retention_class',
]);

export const PROTOCOL_VERSION = 'v0';

// nullableFields: fields the calling type's contract explicitly permits to be
// null/undefined. Any envelope field NOT listed there must be present and non-null.
export function validateEnvelope(obj, { nullableFields = [] } = {}) {
  if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) {
    throw new ProtocolTypeError('Protocol object must be a plain object', { received: obj });
  }

  for (const field of ENVELOPE_FIELDS) {
    if (!(field in obj)) {
      throw new ProtocolTypeError(`Missing load-bearing field: ${field}`, { field });
    }
    const value = obj[field];
    const isNullable = nullableFields.includes(field);
    if ((value === null || value === undefined) && !isNullable) {
      throw new ProtocolTypeError(`Missing load-bearing field: ${field}`, { field });
    }
  }

  if (!isPacketType(obj.protocol_type)) {
    throw new ProtocolTypeError(`Unknown protocol_type: ${obj.protocol_type}`, {
      protocol_type: obj.protocol_type,
    });
  }

  return true;
}

export function validatePayload(obj, requiredPayloadFields, { nullableFields = [] } = {}) {
  for (const field of requiredPayloadFields) {
    if (!(field in obj)) {
      throw new ProtocolTypeError(`Missing load-bearing field: ${field}`, { field });
    }
    const value = obj[field];
    const isNullable = nullableFields.includes(field);
    if ((value === null || value === undefined) && !isNullable) {
      throw new ProtocolTypeError(`Missing load-bearing field: ${field}`, { field });
    }
  }
  return true;
}
