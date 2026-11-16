/** Photon 1.9: mismatch-aware oligo binding for preliminary in-silico screening.
 * Exact ungapped alignment, DNA bases A/C/G/T only; no thermodynamics or BLAST.
 * Primer sequence is 5'->3'. Template coordinates are zero-based half-open.
 */
import {normalizeDNA,reverseComplement} from './dna.mjs';
export function mismatchBindingSites(template,primer,{
  strand='forward',circular=false,maxMismatches=1,protected3Prime=2,
  maxHits=10000
}={}){
  const seq=normalizeDNA(template,{allowAmbiguous:false});
  const p=normalizeDNA(primer,{allowAmbiguous:false});
  if(!seq.length||!p.length)throw new RangeError('Template and primer must be nonempty');
  if(!['forward','reverse'].includes(strand))throw new RangeError('Invalid strand');
  for(const [label,n] of [['maxMismatches',maxMismatches],['protected3Prime',protected3Prime],['maxHits',maxHits]]){
    if(!Number.isSafeInteger(n)||n<0||(label==='maxHits'&&n<1))
      throw new RangeError('Invalid '+label);
  }
  if(maxMismatches>p.length||protected3Prime>p.length)
    throw new RangeError('Mismatch constraints exceed primer length');
  if(p.length>seq.length)return [];
  const target=strand==='forward'?p:reverseComplement(p);
  const n=seq.length,m=p.length;
  const hits=[];
  for(let start=0;start<(circular?n:n-m+1);start++){
    let mismatches=0,protectedMismatch=false;
    const positions=[];
    for(let i=0;i<m;i++){
      if(seq[(start+i)%n]===target[i])continue;
      const primerIndex=strand==='forward'?i:m-1-i;
      if(primerIndex>=m-protected3Prime){protectedMismatch=true;break;}
      mismatches++;
      positions.push(primerIndex); // 0-based, 5'->3' primer coordinates
      if(mismatches>maxMismatches)break;
    }
    if(protectedMismatch||mismatches>maxMismatches)continue;
    if(hits.length>=maxHits)throw new RangeError('Binding hit limit exceeded');
    hits.push({start,end:start+m,strand:strand==='forward'?1:-1,
      wrapsOrigin:!!circular&&start+m>n,
      mismatches,primerMismatchPositions:positions.sort((a,b)=>a-b)});
  }
  return hits.sort((a,b)=>a.mismatches-b.mismatches||a.start-b.start);
}
/** Counts candidate forward/reverse sites. This is NOT PCR amplification
 * probability; product pairing still requires orientation and validation.
 */
export function mismatchPrimerPairScreen(template,forward,reverse,options={}){
  const f=mismatchBindingSites(template,forward,{...options,strand:'forward'});
  const r=mismatchBindingSites(template,reverse,{...options,strand:'reverse'});
  return {forwardSites:f,reverseSites:r,
    summary:{forwardCount:f.length,reverseCount:r.length,
      forwardPerfect:f.filter(x=>x.mismatches===0).length,
      reversePerfect:r.filter(x=>x.mismatches===0).length},
    warning:'Exact-length ungapped mismatch screening only; not thermodynamic or genome-wide specificity'};
}
