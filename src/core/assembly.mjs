/** Photon 1.5 — deterministic, sequence-only overlap assembly.
 * Assumes supplied fragments are already prepared and oriented 5'->3'.
 * No exonuclease kinetics, fidelity, primer or thermo modeling.
 */
import { normalizeDNA } from './dna.mjs';

export function overlapLengths(left, right, { minOverlap = 15, maxOverlap = 250 } = {}) {
  if (!Number.isSafeInteger(minOverlap) || minOverlap < 1 ||
      !Number.isSafeInteger(maxOverlap) || maxOverlap < minOverlap)
    throw new RangeError('Invalid overlap bounds');
  const a = normalizeDNA(left, { allowAmbiguous: false });
  const b = normalizeDNA(right, { allowAmbiguous: false });
  // Require each overlap to leave at least one base of the incoming fragment.
  const limit = Math.min(a.length, b.length - 1, maxOverlap);
  const hits = [];
  for (let n = limit; n >= minOverlap; n--) {
    if (a.slice(-n) === b.slice(0, n)) hits.push(n);
  }
  return hits;
}

/** Assemble in the explicitly supplied fragment order.
 * Ambiguous overlaps are reported rather than silently accepted.
 * Set requireUniqueOverlap to false to intentionally prefer the longest.
 */
export function assembleOverlaps(fragments, { minOverlap = 15, maxOverlap = 250,
  circularize = false, requireUniqueOverlap = true } = {}) {
  if (!Array.isArray(fragments) || fragments.length < 2)
    throw new RangeError('At least two ordered DNA fragments are required');
  const parts = fragments.map(s => normalizeDNA(s, { allowAmbiguous: false }));
  if (parts.some(s => !s)) throw new RangeError('Empty DNA fragment');
  let sequence = parts[0];
  const junctions = [];
  for (let i = 1; i < parts.length; i++) {
    const hits = overlapLengths(sequence, parts[i], { minOverlap, maxOverlap });
    if (!hits.length) throw new RangeError(`Missing overlap at junction ${i}`);
    if (requireUniqueOverlap && hits.length !== 1)
      throw new RangeError(`Ambiguous overlap at junction ${i}: ${hits.join(', ')} bp`);
    const length = hits[0];
    const assemblyPosition = sequence.length - length;
    junctions.push({ fromFragment: i, toFragment: i + 1, overlap: length,
      assemblyPosition, candidates: hits.length });
    sequence += parts[i].slice(length);
  }
  if (circularize) {
    const hits = overlapLengths(parts.at(-1), parts[0], { minOverlap, maxOverlap });
    const valid = hits.filter(n => sequence.slice(-n) === sequence.slice(0, n));
    if (!valid.length) throw new RangeError('No valid terminal overlap for circularization');
    if (requireUniqueOverlap && valid.length !== 1)
      throw new RangeError(`Ambiguous circular junction: ${valid.join(', ')} bp`);
    const length = valid[0];
    if (sequence.length - length < 1) throw new RangeError('Circular product would be empty');
    junctions.push({ fromFragment: parts.length, toFragment: 1,
      overlap: length, assemblyPosition: sequence.length - length,
      candidates: valid.length });
    sequence = sequence.slice(0, -length);
  }
  return { sequence, length: sequence.length, circular: Boolean(circularize),
    fragments: parts.length, junctions, limitations: 'Sequence-only overlap simulation; not an experimental outcome prediction' };
}
