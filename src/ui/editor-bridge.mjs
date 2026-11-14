/** Photon 1.1 browser integration: preserves the legacy UI and delegates edits
 * to the independently tested DNA engine via the legacy-format adapter.
 * The module is loaded only on HTTP(S) deployments; file:// keeps legacy behavior.
 */
import { applySequenceRevision, applyExplicitEdits } from '../core/photon-adapter.mjs';

const host = globalThis.PhotonEditorBridgeHost;
if (!host) throw new Error('Photon legacy editor host was not initialized');

globalThis.PhotonEditorBridgeReady = true;
const histories = new Map();
const clone = value => structuredClone(value);
const repoKey = () => host.identity();
function history() {
  const key = repoKey();
  if (!histories.has(key)) histories.set(key, { past: [], future: [], signature: null });
  return histories.get(key);
}
function signature(w) { return JSON.stringify([w.name,w.seq,w.topology,w.features]); }
function update(w) {
  const target = host.working();
  target.name = w.name;
  target.topology = w.topology;
  target.seq = w.seq;
  target.features = clone(w.features);
  host.selectionReset();
  host.save();
  host.render();
}
function perform(command, sequence) {
  const old = host.working();
  const h = history();
  if (command === 'apply') {
    if(h.signature!==null&&h.signature!==signature(old)){
      h.past.length=0;h.future.length=0;h.signature=null;
    }
    const result = applySequenceRevision(old, sequence);
    if (!result.changed) { host.message('No sequence changes.'); return; }
    h.past.push(clone(old));
    if (h.past.length > 50) h.past.shift();
    h.future.length = 0;
    h.signature = signature(result.working);
    update(result.working);
    host.message(result.affectedFeatures.length
      ? 'Sequence applied; review '+result.affectedFeatures.length+' affected feature(s).'
      : 'Sequence applied.');
    return;
  }
  // Reject stale snapshots when another tool has changed the construct.
  if (h.signature !== null && h.signature !== signature(old)) {
    h.past.length = 0; h.future.length = 0; h.signature = null;
    host.message('Editor history reset after an external construct change.');
    return;
  }
  const source = command === 'undo' ? h.past : h.future;
  const dest = command === 'undo' ? h.future : h.past;
  if (!source.length) { host.message('Nothing to '+command+'.'); return; }
  dest.push(clone(old));
  const next = source.pop();
  h.signature = signature(next);
  update(next);
  host.message(command === 'undo' ? 'Undid sequence edit.' : 'Redid sequence edit.');
}
// Capture phase overrides the old editor's click handlers without replacing its UI.
document.addEventListener('click', event => {
  const target = event.target instanceof Element ? event.target.closest('#ap,#ub,#rb') : null;
  if (!target || !target.closest('#view')) return;
  const command = target.id === 'ap' ? 'apply' : target.id === 'ub' ? 'undo' : 'redo';
  event.preventDefault();
  event.stopImmediatePropagation();
  try {
    const input = document.getElementById('se');
    perform(command, input?.value ?? '');
  } catch (error) {
    host.message('Sequence edit rejected: '+error.message);
  }
}, true);

/** Photon 2.9: deliberate full construct replacement, recorded in the same
 * undo/redo stack as sequence edits. No repository commit is created.
 */
globalThis.PhotonEditorHistory={
 /** Batch operations refer to the unchanged working sequence at call time.
  * One batch produces one undo entry and never creates a repository commit.
  */
 applyEdits(edits){
   const old=host.working(),h=history();
   if(h.signature!==null&&h.signature!==signature(old)){
     h.past.length=0;h.future.length=0;h.signature=null;
   }
   const result=applyExplicitEdits(old,edits);
   if(!result.changed)return false;
   h.past.push(clone(old));if(h.past.length>50)h.past.shift();
   h.future.length=0;h.signature=signature(result.working);
   update(result.working);
   host.message('DNA batch applied; review affected features and commit separately.');
   return true;
 },
 replaceConstruct(next){
   if(!next||typeof next!=='object'||!Array.isArray(next.features)||
      !['linear','circular'].includes(next.topology)||
      typeof next.name!=='string'||typeof next.seq!=='string')
     throw new TypeError('Invalid replacement construct');
   const old=host.working(),h=history();
   if(h.signature!==null&&h.signature!==signature(old)){
     h.past.length=0;h.future.length=0;
   }
   if(signature(old)===signature(next))return false;
   h.past.push(clone(old));if(h.past.length>50)h.past.shift();
   h.future.length=0;
   h.signature=signature(next);
   update(clone(next));
   host.message('Circuit applied to working plasmid. Undo is available; commit separately.');
   return true;
 }
};
