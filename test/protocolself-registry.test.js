import { test } from "node:test";
import assert from "node:assert/strict";
import { bootProtocolSelfRegistry, loadProtocolSelfRegistry } from "../src/protocolself-registry.js";

test("SELF Protocol Suite exposes the pinned OURSELFCOMM 18-protocol registry",()=>{const r=loadProtocolSelfRegistry();assert.equal(r.protocols.length,18);assert.equal(new Set(r.protocols.map(p=>p.id)).size,18);});
test("ProtocolSELF registry boot is metadata-only and cannot open transport",()=>{const r=bootProtocolSelfRegistry();assert.equal(r.status,"REGISTRY_BOOTED_LISTENERS_DISABLED");assert.equal(r.network_listeners_started,0);assert.equal(r.external_bindings_created,0);assert.equal(r.network_transport_authority,"NOT_GRANTED");});
