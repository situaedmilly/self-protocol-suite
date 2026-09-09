// WORKFLOWEXECUTION_SIGNAL v1 — optional workflow classification, not authority.
export const WORKFLOW_SIGNAL_VERSION = 'v1';
export const SIGNAL_PRIORITY = Object.freeze({
  STOP_SIGNAL:100, AUTHORITY_SIGNAL:90, OPERATING_SIGNAL:80,
  OBJECTIVE_SIGNAL:70, INSPECTION_SIGNAL:60, MUTATION_SIGNAL:50,
  VERIFICATION_SIGNAL:40, SEAL_SIGNAL:30, FOUNDATION_SIGNAL:10,
});
export class WorkflowSignalError extends Error {
  constructor(code,message,context={}) {super(message);this.name='WorkflowSignalError';this.code=code;this.context=Object.freeze({...context});}
}
// Supply current user control text, not concatenated retrieved documents or logs.
// Only whole marker lines or SIGNAL: lines are declarations; fenced and quoted
// examples are excluded. This parser cannot authenticate a text's origin.
export function detectWorkflowSignals(prompt) {
  if(typeof prompt!=='string')throw new WorkflowSignalError('INVALID_PROMPT','Prompt must be a string');
  const found=new Set();let fence=null;
  for(const raw of prompt.split(/\r?\n/)) {
    const line=raw.trim();const delimiter=line.match(/^(`{3,}|~{3,})/);
    if(delimiter){if(!fence)fence={char:delimiter[1][0],length:delimiter[1].length};else if(delimiter[1][0]===fence.char&&delimiter[1].length>=fence.length)fence=null;continue;}
    if(fence||line.startsWith('>'))continue;
    const declaration=line.replace(/^SIGNAL:\s*/, '');
    if(!/^[A-Z][A-Z0-9_]*_SIGNAL(?:\s+[A-Z][A-Z0-9_]*_SIGNAL)*$/.test(declaration))continue;
    for(const marker of declaration.split(/\s+/))if(marker!=='WORKFLOWEXECUTION_SIGNAL')found.add(marker);
  }
  const unknown=[...found].filter(s=>!Object.hasOwn(SIGNAL_PRIORITY,s)).sort();
  const signals=[...found].filter(s=>Object.hasOwn(SIGNAL_PRIORITY,s)).sort((a,b)=>SIGNAL_PRIORITY[b]-SIGNAL_PRIORITY[a]||a.localeCompare(b));
  const controlling=signals[0]??null;
  const stop=controlling==='STOP_SIGNAL';
  return Object.freeze({version:WORKFLOW_SIGNAL_VERSION,
    state:stop?'STOP_SIGNAL_ACTIVE':unknown.length?'UNKNOWN_SIGNAL':controlling?'SIGNAL_RESOLVED':'UNCLASSIFIED_SIGNAL',
    controlling_signal:controlling,signals:Object.freeze(signals),unknown_signals:Object.freeze(unknown),
    session_continuation:stop?'HONOR_EXPLICIT_USER_STOP_SCOPE':'CONTINUE_LAWFUL_WORK',
    authority_granted:false,signal_required:false,
  });
}
// Compatibility export: missing/unknown labels no longer throw blanket holds.
export function requireWorkflowSignal(prompt){return detectWorkflowSignals(prompt);}
