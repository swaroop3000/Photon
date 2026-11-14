/** Photon 1.1: adapter between the legacy editor model and the isolated DNA engine.
 * Legacy feature coordinates: 1-based inclusive. Core: 0-based half-open.
 * This module deliberately does not modify the legacy HTML or localStorage.
 */
import { normalizeDNA, editSequence } from './dna.mjs';

function assertLegacyFeature(f, length) {
  if (!f || !Number.isSafeInteger(f.start) || !Number.isSafeInteger(f.end)
      || f.start < 1 || f.end < f.start || f.end > length) {
    throw new RangeError('Invalid 1-based inclusive feature coordinates');
  }
}
function cloneState(w) {
  if (!w || !Array.isArray(w.features)) throw new TypeError('Expected a Photon working construct');
  return { ...w, features: w.features.map(f => ({ ...f })) };
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
/** Apply an edit to a legacy Photon construct without mutating input.
 * Features intersecting an edited region are marked affected for review.
 * A whole-sequence replacement is approximated by one minimal contiguous edit;
 * for multiple disjoint changes, the span between them will be marked affected.
 */
export function applySequenceRevision(working, proposedSequence) {
  const before = normalizeDNA(working.seq);
  const after = normalizeDNA(proposedSequence);
  if (!Array.isArray(working.features)) throw new TypeError('features must be an array');
  const coreFeatures = working.features.map(f => {
    assertLegacyFeature(f, before.length);
    return { ...f, start: f.start - 1 };
  });
  const prev = cloneState(working);
  if (before === after) return { working: prev, changed: false, affectedFeatures: [], edit: null };
  if (working.features.some(f => f.start > f.end)) throw new RangeError('Sequence edits with origin-spanning features require reannotation; no bases were changed');
  const edit = boundsForReplacement(before, after);
  const result = editSequence(before, coreFeatures, edit);
  const features = result.features.map(f => {
    const { affected, ...rest } = f;
    return { ...rest, start: f.start + 1, ...(affected ? { affected: true } : {}) };
  }).filter(f => f.end >= f.start && f.start >= 1 && f.end <= after.length);
  const affectedFeatures = features.filter(f => f.affected).map(f => f.name ?? '(unnamed)');
  return { working: { ...prev, seq: result.sequence, features }, changed: true, affectedFeatures, edit };
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
