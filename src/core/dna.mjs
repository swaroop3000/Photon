/** Photon DNA core 1.0 — dependency-free ES module.
 * Coordinate convention: zero-based, half-open [start,end), plus/minus strand.
 * Circular features crossing origin must be represented by separate intervals.
 * No DOM, network, browser storage, or mutation of caller-owned objects.
 */
export const IUPAC = Object.freeze({ A:'A', C:'C', G:'G', T:'T', R:'AG', Y:'CT', S:'GC', W:'AT', K:'GT', M:'AC', B:'CGT', D:'AGT', H:'ACT', V:'ACG', N:'ACGT' });
const IUPAC_MASKS=Object.freeze(Object.fromEntries(Object.entries(IUPAC).map(([code,bases])=>
  [code,[...bases].reduce((bits,base)=>bits|(1<<'ACGT'.indexOf(base)),0)])));
const COMPLEMENT = Object.freeze({A:'T', C:'G', G:'C', T:'A', R:'Y', Y:'R', S:'S', W:'W', K:'M', M:'K', B:'V', D:'H', H:'D', V:'B', N:'N'});
const CODONS = 'TTT:F TTC:F TTA:L TTG:L TCT:S TCC:S TCA:S TCG:S TAT:Y TAC:Y TAA:* TAG:* TGT:C TGC:C TGA:* TGG:W CTT:L CTC:L CTA:L CTG:L CCT:P CCC:P CCA:P CCG:P CAT:H CAC:H CAA:Q CAG:Q CGT:R CGC:R CGA:R CGG:R ATT:I ATC:I ATA:I ATG:M ACT:T ACC:T ACA:T ACG:T AAT:N AAC:N AAA:K AAG:K AGT:S AGC:S AGA:R AGG:R GTT:V GTC:V GTA:V GTG:V GCT:A GCC:A GCA:A GCG:A GAT:D GAC:D GAA:E GAG:E GGT:G GGC:G GGA:G GGG:G'.split(' ').map(x=>x.split(':'));
export const STANDARD_GENETIC_CODE = Object.freeze(Object.fromEntries(CODONS));
function assertInt(n,name){if(!Number.isSafeInteger(n)) throw new TypeError(`${name} must be a safe integer`);}
/** Normalize DNA, accepting whitespace and an optional conversion of RNA U to T. */
export function normalizeDNA(value,{allowAmbiguous=true,allowRNA=false}={}){
  if(typeof value!=='string') throw new TypeError('DNA sequence must be a string');
  let seq=value.replace(/\s/g,'').toUpperCase();
  if(allowRNA) seq=seq.replace(/U/g,'T');
  const allowed=allowAmbiguous?'ACGTRYSWKMBDHVN':'ACGT';
  for(let i=0;i<seq.length;i++) if(!allowed.includes(seq[i])) throw new RangeError(`Invalid DNA base '${seq[i]}' at zero-based position ${i}`);
  return seq;
}
export function reverseComplement(seq){return [...normalizeDNA(seq)].reverse().map(c=>COMPLEMENT[c]).join('');}
export function gcContent(seq){const s=normalizeDNA(seq);if(!s.length)return null;let gc=0,known=0;for(const c of s){if('ACGT'.includes(c)){known++;if(c==='C'||c==='G')gc++;}}return known?gc/known:null;}
/** Translate complete codons. Ambiguous codons resolve when all possible codons encode the same residue, otherwise X. */
export function translate(seq,{frame=0,stopAtStop=false,partial='ignore'}={}){
  assertInt(frame,'frame'); if(frame<0||frame>2)throw new RangeError('frame must be 0, 1 or 2');
  if(!['ignore','error'].includes(partial)) throw new RangeError('partial must be ignore or error');
  const s=normalizeDNA(seq);if(partial==='error'&&(s.length-frame)%3!==0) throw new RangeError('Trailing incomplete codon');
  let protein='';for(let i=frame;i+2<s.length;i+=3){
    const codon=s.slice(i,i+3);let aa=STANDARD_GENETIC_CODE[codon];
    if(!aa){const outcomes=new Set();for(const a of IUPAC[codon[0]])for(const b of IUPAC[codon[1]])for(const c of IUPAC[codon[2]])outcomes.add(STANDARD_GENETIC_CODE[a+b+c]);aa=outcomes.size===1?[...outcomes][0]:'X';}
    if(stopAtStop&&aa==='*')break;protein+=aa;
  }return protein;
}
/** Motif search on either strand. IUPAC codes in sequence and motif match when
 * their possible base sets intersect. Hits are possible matches, not proof of
 * an exact sequence or enzyme binding. Coordinates are 0-based.
 */
export function findMotif(sequence,motif,{circular=false,bothStrands=false}={}){
  const seq=normalizeDNA(sequence), pattern=normalizeDNA(motif);if(!pattern.length)throw new RangeError('Motif must be nonempty');
  const n=seq.length;if(!n)return [];
  const limit=circular?n:Math.max(0,n-pattern.length+1);if(!circular&&pattern.length>n)return [];
  if(circular&&pattern.length>n)throw new RangeError('Circular motif longer than sequence');
  const patterns=[{p:pattern,strand:1}];const rc=reverseComplement(pattern);
  if(bothStrands&&rc!==pattern)patterns.push({p:rc,strand:-1});
  const hits=[];for(let i=0;i<limit;i++)for(const {p,strand} of patterns){
    let match=true;for(let j=0;j<p.length;j++){const base=seq[(i+j)%n];if(!(IUPAC_MASKS[p[j]]&IUPAC_MASKS[base])){match=false;break;}}
    if(match)hits.push({start:i,end:i+p.length,strand});
  }return hits;
}
/** Strict edit and annotation coordinate transformation. Overlapping features are flagged rather than silently asserted valid. */
export function editSequence(sequence,features,{start,end,insert=''}){
  const s=normalizeDNA(sequence);assertInt(start,'start');assertInt(end,'end');if(start<0||end<start||end>s.length)throw new RangeError('Invalid edit interval');
  if(!Array.isArray(features))throw new TypeError('features must be an array');
  const replacement=normalizeDNA(insert),delta=replacement.length-(end-start);
  const newFeatures=transformFeatures(features,s.length,{start,end,insert:replacement});
  return {sequence:s.slice(0,start)+replacement+s.slice(end),features:newFeatures,delta};
}
function transformFeatures(features,length,{start,end,insert:replacement}){
  const delta=replacement.length-(end-start),newFeatures=[];
  for(const f of features){
    if(!f||typeof f!=='object')throw new TypeError('Feature must be an object');
    const a=f.start,b=f.end;assertInt(a,'feature.start');assertInt(b,'feature.end');if(a<0||b<a||b>length)throw new RangeError('Invalid feature interval');
    let startNew=a,endNew=b,affected=false;
    if(start===end){
      if(start<=a){startNew+=delta;endNew+=delta;}
      else if(start<b){endNew+=delta;affected=true;}
    }else if(b<=start){ /* unchanged */ }
    else if(a>=end){startNew+=delta;endNew+=delta;}
    else {affected=true;startNew=a<start?a:start;endNew=b>end?b+delta:start+replacement.length;}
    if(startNew>endNew)endNew=startNew;
    newFeatures.push({...f,start:startNew,end:endNew,affected:affected||Boolean(f.affected)});
  }
  return newFeatures;
}
/** Explicit original-coordinate batch for non-wrapped features. Normalize the
 * genome once and concatenate unchanged segments once, rather than copying and
 * validating the full genome per operation. Coordinate transforms retain the
 * right-to-left policy, rejecting any intermediate erased annotation atomically.
 * Sequence work is O(bases + inserted bases + edits log edits); annotation work
 * remains O(features * edits). This is not whole-genome editor virtualization.
 */
export function editSequenceBatch(sequence,features,operations){
  const s=normalizeDNA(sequence);
  if(!Array.isArray(features))throw new TypeError('features must be an array');
  if(!Array.isArray(operations)||!operations.length)throw new RangeError('At least one edit is required');
  const edits=operations.map(op=>{
    if(!op)throw new RangeError('Invalid edit interval');
    const {start,end}=op;assertInt(start,'start');assertInt(end,'end');
    if(start<0||end<start||end>s.length)throw new RangeError('Invalid edit interval');
    return {start,end,insert:normalizeDNA(op.insert??'')};
  }).sort((a,b)=>b.start-a.start||b.end-a.end);
  for(let i=1;i<edits.length;i++){
    if(edits[i].end>edits[i-1].start||edits[i].start===edits[i-1].start)
      throw new RangeError('Overlapping or coincident edits are ambiguous');
  }
  let mapped=features,length=s.length;
  for(const edit of edits){
    mapped=transformFeatures(mapped,length,edit);
    if(mapped.some(f=>f.end<=f.start))
      throw new RangeError('Edit would erase an annotation; remove or reannotate it explicitly');
    length+=edit.insert.length-(edit.end-edit.start);
  }
  const parts=[];let cursor=0;
  for(let i=edits.length-1;i>=0;i--){
    const edit=edits[i];parts.push(s.slice(cursor,edit.start),edit.insert);cursor=edit.end;
  }
  parts.push(s.slice(cursor));
  return {sequence:parts.join(''),features:mapped,delta:length-s.length};
}
export function parseFASTA(text){
  if(typeof text!=='string')throw new TypeError('FASTA input must be a string');const records=[];let current=null;
  for(const raw of text.split(/\r?\n/)){const line=raw.trim();if(!line)continue;if(line.startsWith('>')){current={id:line.slice(1).trim().split(/\s+/)[0],description:line.slice(1).trim(),sequence:''};if(!current.id)throw new RangeError('FASTA header requires ID');records.push(current);}else{if(!current)throw new RangeError('Sequence before FASTA header');current.sequence+=normalizeDNA(line);}}
  if(!records.length)throw new RangeError('No FASTA records');return records;
}
export function toFASTA(id,sequence,{width=80}={}){
  if(typeof id!=='string'||!id.trim()||/[\r\n]/.test(id))throw new RangeError('Invalid FASTA identifier');assertInt(width,'width');if(width<1)throw new RangeError('FASTA width must be positive');
  const seq=normalizeDNA(sequence);return `>${id.trim()}\n${seq.match(new RegExp(`.{1,${width}}`,'g'))?.join('\n')||''}\n`;
}
