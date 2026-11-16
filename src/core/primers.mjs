/** Photon 1.7 — exact-match virtual PCR and heuristic primer screening.
 * 0-based half-open coordinates; oligos 5'→3'. Tm excludes buffer conditions.
 */
import { normalizeDNA, reverseComplement } from './dna.mjs';
function dna(input,label,min=1,max=200) {
  const value=normalizeDNA(input,{allowAmbiguous:false});
  if(value.length<min||value.length>max)throw new RangeError(`${label} length must be ${min}–${max} nt`);
  return value;
}
function matching(seq,needle,start,circular){
  for(let i=0;i<needle.length;i++)if(seq[circular?(start+i)%seq.length:start+i]!==needle[i])return false;
  return true;
}
export function primerBindingSites(template,primer,{circular=false,strand='forward'}={}){
  const seq=dna(template,'Template',1,Number.MAX_SAFE_INTEGER),p=dna(primer,'Primer');
  if(!['forward','reverse'].includes(strand))throw new RangeError('Unknown primer strand');
  if(p.length>seq.length)return [];
  const target=strand==='reverse'?reverseComplement(p):p;
  const sites=[],count=circular?seq.length:seq.length-p.length+1;
  for(let i=0;i<count;i++)if(matching(seq,target,i,circular))sites.push({start:i,end:i+p.length,strand:strand==='forward'?1:-1,wrapsOrigin:!!circular&&i+p.length>seq.length});
  return sites;
}
export function primerMetrics(primer){
  const seq=dna(primer,'Primer'),n=seq.length;
  const gc=[...seq].filter(c=>c==='G'||c==='C').length;
  const tm=n<14?2*(n-gc)+4*gc:64.9+41*(gc-16.4)/n;
  const rc=reverseComplement(seq);
  let longest=0;
  for(let offset=-(n-1);offset<n;offset++){
    let streak=0;
    for(let i=0;i<n;i++){
      const j=i+offset;
      if(j>=0&&j<n&&seq[i]===rc[j]){streak++;longest=Math.max(longest,streak);}else streak=0;
    }
  }
  let hairpinStem=0;
  for(let left=0;left<n;left++)for(let right=left+4;right<n;right++){
    let k=0;
    while(left+k<right-k-3 && seq[left+k]===reverseComplement(seq[right-k]))k++;
    hairpinStem=Math.max(hairpinStem,k);
  }
  return {sequence:seq,length:n,gcPercent:100*gc/n,approxTmC:Math.round(tm*10)/10,
    longestSelfComplementRun:longest,possibleSelfDimer:longest>=5,
    longestHairpinStem:hairpinStem,possibleHairpin:hairpinStem>=4,
    method:n<14?'Wallace rule':'simple long-oligo approximation',
    warning:'Approximate screening only; use Primer3 and thermodynamic validation for lab work'};
}
export function virtualPCRProducts(template,forward,reverse,{circular=false,maxProducts=1000}={}){
  const seq=dna(template,'Template',1,Number.MAX_SAFE_INTEGER);
  const f=dna(forward,'Forward primer'),r=dna(reverse,'Reverse primer');
  if(!Number.isSafeInteger(maxProducts)||maxProducts<1)throw new RangeError('Invalid maxProducts');
  const fs=primerBindingSites(seq,f,{circular,strand:'forward'});
  const rs=primerBindingSites(seq,r,{circular,strand:'reverse'});
  const products=[],n=seq.length,extended=seq+seq;
  for(const left of fs)for(const right of rs){
    let end=right.end;
    if(circular){while(end<=left.start)end+=n;}
    else if(end<=left.start||end>n)continue;
    const size=end-left.start;
    let reverseStart=right.start;
    if(circular){while(reverseStart<left.start)reverseStart+=n;}
    if(reverseStart<left.start+f.length||size>n||size<Math.max(f.length,r.length))continue;
    if(products.length>=maxProducts)throw new RangeError('Too many possible products');
    products.push({start:left.start,end:end%n||n,length:size,circularTemplate:!!circular,
      wrapsOrigin:end>n,sequence:(circular?extended:seq).slice(left.start,end),
      forwardSite:left.start,reverseSite:right.start});
  }
  return products.sort((a,b)=>a.start-b.start||a.length-b.length||a.reverseSite-b.reverseSite);
}
