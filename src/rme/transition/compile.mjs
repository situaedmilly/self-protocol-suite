/**
 * RME transition compiler v0.1
 *
 * Pure planner. It does not execute transitions or mint authority.
 * Input: observed state + desired predicate + bounded gaps.
 * Output: deterministic transition DAG.
 */

const TRANSITION_ORDER = [
  "RECONTACT_MCB06",
  "BIND_VERIFIED_INSTANCE",
  "QUARANTINE_UNCORROBORATED_CLAIM",
  "VERIFY_ARTIFACTS",
  "COMPUTE_DELTA",
  "COMPILE_FOUNDER_BOOTSTRAP",
  "MUTATION_GATE",
  "ACTUATE",
  "WITNESS",
  "ADMIT",
];

function stableId(name) {
  return `RME-${name}`;
}

export function compileTransitionDag({ preStateHash, desiredReality, observations = {} }) {
  if (!preStateHash || typeof preStateHash !== "string") {
    throw new TypeError("preStateHash is required");
  }
  if (!desiredReality || typeof desiredReality !== "object") {
    throw new TypeError("desiredReality is required");
  }

  const hasBoundMcb = observations.mcb06Instance === "MCB-06-DIFF-001";
  const hasUncorroborated35Claim = observations.mcb06_35_claim === "UNCORROBORATED";
  const founderBootstrapMissing = observations.founderBootstrap !== "PRESENT";

  const transitions = [];

  transitions.push({
    id: stableId("T1-RECONTACT"),
    type: "RECONTACT",
    depends_on: [],
    precondition: "CURRENT_STATE_CAPTURED",
    authority: "OBSERVATION",
    action: "RECONTACT_MCB06",
    postcondition: "MCB06_INSTANCE_IDENTIFIED_OR_UNKNOWN",
    evidence: ["INSTANCE_ID", "CURRENT_ARTIFACT_BINDING"],
    rollback: "NONE",
  });

  if (hasBoundMcb) {
    transitions.push({
      id: stableId("T2-BIND"),
      type: "BIND",
      depends_on: [stableId("T1-RECONTACT")],
      precondition: "MCB06_INSTANCE_IDENTIFIED",
      authority: "EVIDENCE_BINDING",
      action: "BIND_MCB06_DIFF_001",
      postcondition: "MCB06_DIFF_001_BOUND",
      evidence: ["INSTANCE_BINDING", "ARTIFACT_HASHES"],
      rollback: "UNBIND_CURRENT_CLAIM",
    });
  }

  if (hasUncorroborated35Claim) {
    transitions.push({
      id: stableId("T3-QUARANTINE"),
      type: "QUARANTINE",
      depends_on: [stableId("T1-RECONTACT")],
      precondition: "35_VECTOR_CLAIM_UNCORROBORATED",
      authority: "PROVENANCE_CONTROL",
      action: "QUARANTINE_35_VECTOR_CLAIM",
      postcondition: "CLAIM_CANNOT_MUTATE_CANONICAL_STATE",
      evidence: ["PROVENANCE_RECORD"],
      rollback: "REMOVE_QUARANTINE_ONLY_AFTER_NEW_EVIDENCE",
    });
  }

  transitions.push({
    id: stableId("T4-VERIFY"),
    type: "VERIFY",
    depends_on: transitions.filter(t => ["RME-T2-BIND","RME-T3-QUARANTINE"].includes(t.id)).map(t => t.id),
    precondition: "INSTANCE_AND_PROVENANCE_RELATIONS_BOUND",
    authority: "VALIDATION",
    action: "VERIFY_ARTIFACTS",
    postcondition: "EVIDENCE_BINDINGS_CLASSIFIED",
    evidence: ["HASHES", "MANIFEST", "FORENSIC_LINEAGE"],
    rollback: "MARK_UNVERIFIED",
  });

  transitions.push({
    id: stableId("T5-DELTA"),
    type: "PLAN",
    depends_on: [stableId("T4-VERIFY")],
    precondition: "EVIDENCE_BINDINGS_CLASSIFIED",
    authority: "PLANNING",
    action: "COMPUTE_DELTA",
    postcondition: "MINIMAL_DELTA_COMPILED",
    evidence: ["DELTA_RECORD"],
    rollback: "DISCARD_PLAN",
  });

  if (founderBootstrapMissing) {
    transitions.push({
      id: stableId("T6-BOOTSTRAP"),
      type: "PLAN",
      depends_on: [stableId("T5-DELTA")],
      precondition: "FOUNDER_BOOTSTRAP_MISSING",
      authority: "PLANNING",
      action: "COMPILE_FOUNDER_BOOTSTRAP",
      postcondition: "FOUNDER_BOOTSTRAP_PLAN_READY",
      evidence: ["TRANSITION_DAG"],
      rollback: "DISCARD_PLAN",
    });
  }

  const prior = transitions[transitions.length - 1].id;
  transitions.push(
    {
      id: stableId("T7-GATE"),
      type: "GATE",
      depends_on: [prior],
      precondition: "PLAN_READY",
      authority: "FOUNDER_EXPLICIT",
      action: "EVALUATE_MUTATION_GATE",
      postcondition: "ACTUATION_AUTHORITY_EXACTLY_BOUND",
      evidence: ["AUTHORITY_RELATION"],
      rollback: "REVOKE_PENDING_AUTHORITY",
    },
    {
      id: stableId("T8-ACTUATE"),
      type: "ACTUATE",
      depends_on: [stableId("RME-T7-GATE")],
      precondition: "VALID && AUTHORIZED && ACTUATABLE && SAFE && EXECUTABLE",
      authority: "EXACT_TRANSITION_AUTHORITY",
      action: "EXECUTE_BOUND_TRANSITION",
      postcondition: "EFFECT_REQUESTED",
      evidence: ["EXECUTION_RECORD"],
      rollback: "GOVERNED_RECOVERY",
    },
    {
      id: stableId("T9-WITNESS"),
      type: "WITNESS",
      depends_on: [stableId("RME-T8-ACTUATE")],
      precondition: "EXECUTION_RECORDED",
      authority: "WITNESS",
      action: "OBSERVE_EFFECT",
      postcondition: "EFFECT_CLASSIFIED",
      evidence: ["OBSERVATION", "RECEIPT"],
      rollback: "MARK_EFFECT_UNVERIFIED",
    },
    {
      id: stableId("T10-ADMIT"),
      type: "ADMIT",
      depends_on: [stableId("RME-T9-WITNESS")],
      precondition: "EFFECT_OBSERVED && EVIDENCE_COMPLETE",
      authority: "ADMISSION",
      action: "ADMIT_STATE",
      postcondition: "DESIRED_REALITY_PREDICATE_EVALUATED",
      evidence: ["ADMISSION_RECORD"],
      rollback: "CREATE_SUCCESSOR_STATE",
    }
  );

  return {
    plan_id: "RME-001.1",
    pre_state_hash: preStateHash,
    desired_reality: desiredReality,
    transitions,
    terminal_predicate: "FOUNDER_USER_CAPABLE_UTILIZATION",
    execution_boundary: "T8-ACTUATE",
    compiler_is_non_effectful: true,
    transition_order: TRANSITION_ORDER,
  };
}
