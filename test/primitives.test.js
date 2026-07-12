import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  PRIMITIVE_NOUNS,
  PRIMITIVE_VERBS,
  PACKET_TYPES,
  assertRegistrationAllowed,
} from '../src/primitives.js';
import { ProtocolDuplicatePrimitiveError } from '../src/errors.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC_DIR = join(__dirname, '..', 'src');

test('primitive catalog is immutable', () => {
  assert.throws(() => {
    PRIMITIVE_NOUNS.push('ROGUE');
  }, TypeError);
  assert.throws(() => {
    PRIMITIVE_VERBS.push('ROGUE');
  }, TypeError);
  assert.throws(() => {
    PACKET_TYPES.push('RoguePacket');
  }, TypeError);
  assert.ok(Object.isFrozen(PRIMITIVE_NOUNS));
  assert.ok(Object.isFrozen(PRIMITIVE_VERBS));
  assert.ok(Object.isFrozen(PACKET_TYPES));
});

test('duplicate primitives are rejected', () => {
  assert.throws(
    () => assertRegistrationAllowed(PRIMITIVE_NOUNS, 'MISSION', 'primitive noun'),
    ProtocolDuplicatePrimitiveError,
  );
  assert.throws(
    () => assertRegistrationAllowed(PRIMITIVE_VERBS, 'DECLARE', 'primitive verb'),
    ProtocolDuplicatePrimitiveError,
  );
  assert.doesNotThrow(() =>
    assertRegistrationAllowed(PRIMITIVE_NOUNS, 'NOT_YET_REGISTERED', 'primitive noun'),
  );
});

// --- Dependency-direction proof -------------------------------------------
// The protocol core must be the dependency-free root. It may never import
// any peer OURSELF repository, any provider SDK, any web framework, or any
// database client. This statically scans every file under src/.

const FORBIDDEN_IMPORT_SUBSTRINGS = [
  'ourself-cloud-server-network',
  'ourself-agent-bridge',
  'agent-bridge',
  '@anthropic',
  'anthropic',
  'openai',
  'google',
  'microsoft',
  'apple',
  'mcp',
  'express',
  'fastify',
  'pg',
  'mongodb',
  'mysql',
  'redis',
];

const IMPORT_LINE_PATTERN = /(?:import\s+.*?from\s+|import\s*\(|require\s*\()\s*['"]([^'"]+)['"]/g;

function listJsFiles(dir) {
  const entries = readdirSync(dir);
  let files = [];
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    if (statSync(fullPath).isDirectory()) {
      files = files.concat(listJsFiles(fullPath));
    } else if (entry.endsWith('.js')) {
      files.push(fullPath);
    }
  }
  return files;
}

test('forbidden reverse imports fail static inspection', () => {
  const files = listJsFiles(SRC_DIR);
  assert.ok(files.length > 0, 'expected at least one source file to scan');

  const violations = [];
  for (const file of files) {
    const contents = readFileSync(file, 'utf8');
    let match;
    while ((match = IMPORT_LINE_PATTERN.exec(contents)) !== null) {
      const specifier = match[1].toLowerCase();
      // node: built-ins are always allowed.
      if (specifier.startsWith('node:') || specifier.startsWith('.')) {
        continue;
      }
      for (const forbidden of FORBIDDEN_IMPORT_SUBSTRINGS) {
        if (specifier.includes(forbidden)) {
          violations.push({ file, specifier, forbidden });
        }
      }
    }
  }

  assert.deepEqual(violations, [], `forbidden reverse imports found: ${JSON.stringify(violations)}`);
});

test('package.json declares no external production dependencies', () => {
  const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf8'));
  assert.deepEqual(pkg.dependencies || {}, {});
  assert.equal(pkg.private, true);
});
