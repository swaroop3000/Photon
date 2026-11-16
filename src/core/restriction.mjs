/** Photon 1.2 — deterministic restriction mapping and virtual digestion.
 * This first release supports curated palindromic Type II restriction enzymes.
 * Coordinates: zero-based interbase cut sites; never clinical/lab-validated.
 */
import { normalizeDNA, reverseComplement, IUPAC } from './dna.mjs';

export const TYPE_II_ENZYMES = Object.freeze({
  EcoRI: Object.freeze({recognition:'GAATTC',topCut:1,bottomCut:5}),
  BamHI: Object.freeze({recognition:'GGATCC',topCut:1,bottomCut:5}),
  HindIII: Object.freeze({recognition:'AAGCTT',topCut:1,bottomCut:5}),
  PstI: Object.freeze({recognition:'CTGCAG',topCut:5,bottomCut:1}),
  EcoRV: Object.freeze({recognition:'GATATC',topCut:3,bottomCut:3}),
  SmaI: Object.freeze({recognition:'CCCGGG',topCut:3,bottomCut:3}),
  NotI: Object.freeze({recognition:'GCGGCCGC',topCut:2,bottomCut:6})
});
function integer(n,name) {
  if (!Number.isSafeInteger(n)) throw new TypeError(name+' must be an integer');
}
function validateEnzyme(name, enzyme) {
  if (!enzyme || typeof enzyme!=='object') throw new TypeError('Invalid enzyme');
  const recognition=normalizeDNA(enzyme.recognition);
  if(!recognition.length || recognition!==reverseComplement(recognition)) {
    throw new RangeError('Only palindromic recognition sites are supported');
  }
  const {topCut,bottomCut}=enzyme;
  integer(topCut,'topCut'); integer(bottomCut,'bottomCut');
  if(topCut<0||bottomCut<0||topCut>recognition.length||bottomCut>recognition.length)
    throw new RangeError('Cut offsets must lie inside recognition site');
  return {name,recognition,topCut,bottomCut};
}
function matches(seq,pattern,start,circular) {
  for(let j=0;j<pattern.length;j++){
    const base=seq[circular?(start+j)%seq.length:start+j];
    if(!IUPAC[pattern[j]].includes(base)) return false;
  }
  return true;
}
/** Returns sites with cuts between nucleotides.
 * A cut=0 is before base 1; a cut=n is after base n.
 * Enzyme orientation is irrelevant for these curated palindromic sites.
 */
export function restrictionSites(sequence, enzymeNames=['EcoRI'], {circular=false,enzymes=TYPE_II_ENZYMES}={}) {
  const seq=normalizeDNA(sequence,{allowAmbiguous:false});
  if(!Array.isArray(enzymeNames))throw new TypeError('Enzymes must be an array');
  if(!seq.length)return [];
  const hits=[],seen=new Set(),n=seq.length;
  for(const name of enzymeNames) {
    if(seen.has(name)) continue;
    seen.add(name);
    if(!Object.hasOwn(enzymes,name))throw new RangeError('Unknown enzyme: '+name);
    const {recognition,topCut,bottomCut}=validateEnzyme(name,enzymes[name]);
    const m=recognition.length;
    if(m>n)continue;
    for(let start=0;start<(circular?n:n-m+1);start++) {
      if(!matches(seq,recognition,start,circular))continue;
      let cut=start+topCut,reverseCut=start+bottomCut;
      if(circular){cut%=n;reverseCut%=n;}
      hits.push({enzyme:name,start,end:start+m,topCut:cut,bottomCut:reverseCut,
        overhangLength:Math.abs(topCut-bottomCut),
        overhangType:topCut===bottomCut?'blunt':topCut<bottomCut?'5-prime':'3-prime',
        wrapsOrigin:circular&&start+m>n});
    }
  }
  return hits.sort((a,b)=>a.topCut-b.topCut||a.enzyme.localeCompare(b.enzyme)||a.start-b.start);
}
/** Fragment lengths based on top-strand cut positions.
 * Sticky ends are reported separately; no ligation or end chemistry modeled.
 */
export function virtualDigest(sequence,enzymeNames=['EcoRI'],options={}) {
  const seq=normalizeDNA(sequence,{allowAmbiguous:false}),n=seq.length;
  const circular=Boolean(options.circular);
  const sites=restrictionSites(seq,enzymeNames,options);
  const cuts=[...new Set(sites.map(x=>x.topCut))].sort((a,b)=>a-b);
  let fragments=[];
  if(!n) fragments=[];
  else if(circular) {
    fragments=cuts.length===0?[n]:cuts.map((cut,i)=>(cuts[(i+1)%cuts.length]-cut+n)%n||n);
  } else {
    const points=[0,...cuts,n].sort((a,b)=>a-b);
    fragments=points.slice(1).map((p,i)=>p-points[i]).filter(x=>x>0);
  }
  if(fragments.reduce((a,b)=>a+b,0)!==n) throw new Error('Digest length invariant violated');
  return {length:n,topology:circular?'circular':'linear',sites,cuts,fragments:fragments.sort((a,b)=>b-a)};
}
