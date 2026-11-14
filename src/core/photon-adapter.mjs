/** Photon 1.1: adapter between the legacy editor model and the isolated DNA engine.
 * Legacy feature coordinates: 1-based inclusive. Core: 0-based half-open.
 * This module deliberately does not modify the legacy HTML or localStorage.
 */
import { normalizeDNA, editSequence, editSequenceBatch } from './dna.mjs';
import { applyCircularGapEdit } from './circular-edit.mjs';

function assertLegacyFeature(f, length) {
  if (!f || !Number.isSafeInteger(f.start) || !Number.isSafeInteger(f.end)
      || f.start < 1 || f.end < f.start || f.end > length) {
    throw new RangeError('Invalid 1-based inclusive feature coordinates');
  }
}
function cloneState(w) {
  if (!w || !Array.isArray(w.features)) throw new TypeError('Expected a Photon working construct');
  return structuredClone(w);
}
function boundsForReplacement(oldSeq, newSeq) {
  let left = 0;
  while (left < oldSeq.length && left < newSeq.length && oldSeq[left] === newSeq[left]) left++;
  let oldRight = oldSeq.length, newRight = newSeq.length;
  while (oldRight > left && newRight > left && oldSeq[oldRight - 1] === newSeq[newRight - 1]) {
    oldRight--; newRight--;
  }
  return { start: left, end: oldRight, insert: newSeq.slice(left, newRight) };
}
/**
 * Represent independent substitutions as separate edits only for equal-length
 * replacements. An insertion/deletion changes coordinate alignment; without
 * verified anchors, the conservative contiguous edit remains safer.
 * End-to-start order ensures earlier original coordinates remain valid.
 */
export function revisionEdits(oldSeq, newSeq) {
  const before = normalizeDNA(oldSeq), after = normalizeDNA(newSeq);
  if (before.length !== after.length) return before===after ? [] : [boundsForReplacement(before,after)];
  const edits = [];
  let i = 0;
  while (i < before.length) {
    if (before[i] === after[i]) { i++; continue; }
    const start = i;
    while (i < before.length && before[i] !== after[i]) i++;
    edits.push({start,end:i,insert:after.slice(start,i)});
  }
  return edits.reverse();
}
/** Apply an edit to a legacy Photon construct without mutating input.
 * Features intersecting an edited region are marked affected for review.
 * Equal-length disjoint substitutions are treated as independent edits.
 * Insertions/deletions are conservatively represented as one contiguous edit,
 * which may flag intervening annotations for manual review.
 */
export function applySequenceRevision(working, proposedSequence) {
  const before = normalizeDNA(working.seq);
  const after = normalizeDNA(proposedSequence);
  if (!Array.isArray(working.features)) throw new TypeError('features must be an array');
  // Existing wrapped features are valid on circles, but the current linear
  // edit liftover cannot safely relocate them after sequence changes.
  // Validate every feature before accepting even a no-op revision. Otherwise
  // malformed annotations can silently survive until a subsequent edit.
  for (const feature of working.features) {
    if (feature.start > feature.end) {
      if (working.topology !== 'circular' ||
          !Number.isSafeInteger(feature.start) || !Number.isSafeInteger(feature.end) ||
          feature.end < 1 || feature.start > before.length) {
        throw new RangeError('Invalid circular origin-spanning feature coordinates');
      }
    } else {
      assertLegacyFeature(feature, before.length);
    }
  }
  const hasWrapped = working.features.some(f => f.start > f.end);
  if(hasWrapped) {
    if(working.topology!=='circular') throw new RangeError('Origin-spanning features require circular DNA');
    if(before===after) return {working:cloneState(working),changed:false,affectedFeatures:[],edit:null};
    const edits = revisionEdits(before,after);
    let current = cloneState(working),last=null;
    for (const edit of edits) {
      last = applyCircularGapEdit(current,edit);
      current = last.working;
    }
    return {working:current,changed:true,
      affectedFeatures:current.features.filter(f=>f.affected).map(f=>f.name??'(unnamed)'),
      edit:edits.length===1?edits[0]:null,edits};
  }
  const coreFeatures = working.features.map(f => {
    assertLegacyFeature(f, before.length);
    return { ...structuredClone(f), start: f.start - 1 };
  });
  const prev = cloneState(working);
  if (before === after) return { working: prev, changed: false, affectedFeatures: [], edit: null };
  const edits = revisionEdits(before, after);
  let result = {sequence:before,features:coreFeatures};
  for (const edit of edits) {
    result = editSequence(result.sequence, result.features, edit);
  }
  // A zero-length annotation has no valid representation in the legacy
  // 1-based inclusive model. Reject the transaction rather than silently
  // dropping a feature from the construct and its future commits.
  if (result.features.some(f => f.end <= f.start)) {
    throw new RangeError('Edit would erase an annotation; remove or reannotate it explicitly');
  }
  const features = result.features.map(f => {
    const { affected, ...rest } = f;
    return { ...rest, start: f.start + 1, ...(affected ? { affected: true } : {}) };
  });
  if (features.some(f => f.end < f.start || f.start < 1 || f.end > after.length)) {
    throw new RangeError('Edit produces invalid annotation coordinates; reannotation required');
  }
  const affectedFeatures = features.filter(f => f.affected).map(f => f.name ?? '(unnamed)');
  return { working: { ...prev, seq: result.sequence, features }, changed: true, affectedFeatures, edit: edits.length===1?edits[0]:null, edits };
}
/**
 * Apply an explicit, nonoverlapping batch of zero-based half-open edits against
 * the ORIGINAL sequence. Each edit is {start,end,insert}; no alignment guesswork.
 * Edits are applied right-to-left so coordinates of earlier edits do not shift.
 * Returns a single atomic construct revision: any unsafe feature edit aborts all.
 * Zero-length insertions at the same coordinate are ambiguous and rejected.
 */
export function applyExplicitEdits(working, operations) {
  if(!Array.isArray(operations)||!operations.length)throw new RangeError('At least one edit is required');
  const before=normalizeDNA(working?.seq);
  if(!['linear','circular'].includes(working?.topology))
    throw new RangeError('Invalid DNA topology');
  if(!Array.isArray(working.features))throw new TypeError('features must be an array');
  const edits=operations.map(op=>{
    if(!op||!Number.isSafeInteger(op.start)||!Number.isSafeInteger(op.end)||
       op.start<0||op.end<op.start||op.end>before.length)
      throw new RangeError('Invalid edit interval');
    return {start:op.start,end:op.end,insert:normalizeDNA(op.insert??'')};
  }).sort((a,b)=>b.start-a.start||b.end-a.end);
  for(let i=1;i<edits.length;i++){
    if(edits[i].end>edits[i-1].start || edits[i].start===edits[i-1].start)
      throw new RangeError('Overlapping or coincident edits are ambiguous');
  }
  for(const f of working.features){
    if(f.start>f.end){
      if(working.topology!=='circular'||!Number.isSafeInteger(f.start)||
         !Number.isSafeInteger(f.end)||f.end<1||f.start>before.length)
        throw new RangeError('Invalid circular origin-spanning feature coordinates');
    }else assertLegacyFeature(f,before.length);
  }
  let current=cloneState(working);
  if(!current.features.some(f=>f.start>f.end)){
    const result=editSequenceBatch(before,current.features.map(f=>({...f,start:f.start-1})),edits);
    const features=result.features.map(f=>{
      const {affected,...rest}=f;
      return {...rest,start:f.start+1,...(affected?{affected:true}:{})};
    });
    if(features.some(f=>f.start<1||f.end>result.sequence.length))
      throw new RangeError('Edit produces invalid annotation coordinates; reannotation required');
    current={...current,seq:result.sequence,features};
  }else{
    for(const edit of edits){
      current=applyCircularGapEdit(current,edit).working;
    }
  }
  return {working:current,changed:current.seq!==before,
    affectedFeatures:current.features.filter(f=>f.affected).map(f=>f.name??'(unnamed)'),
    edits};
}

/** History stores full sequence+feature snapshots (not sequence-only).
 * Bound history is intentionally ephemeral; caller decides how to persist it.
 */
export function createEditorHistory(initial, { limit = 50 } = {}) {
  if (!Number.isSafeInteger(limit) || limit < 1) throw new RangeError('Invalid history limit');
  let current = cloneState(initial);
  const past = [], future = [];
  return {
    get current() { return cloneState(current); },
    get canUndo() { return past.length > 0; },
    get canRedo() { return future.length > 0; },
    apply(sequence) {
      const result = applySequenceRevision(current, sequence);
      if (result.changed) {
        past.push(cloneState(current));
        if (past.length > limit) past.shift();
        current = cloneState(result.working);
        future.length = 0;
      }
      return result;
    },
    undo() {
      if (!past.length) return null;
      future.push(cloneState(current));
      current = past.pop();
      return cloneState(current);
    },
    redo() {
      if (!future.length) return null;
      past.push(cloneState(current));
      current = future.pop();
      return cloneState(current);
    }
  };
}
