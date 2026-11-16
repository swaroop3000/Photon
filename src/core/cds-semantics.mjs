/** Explicit, bounded interpretation of GenBank CDS qualifiers.
 * Tables 1 and 11 have identical internal codons; initiation differs.
 * Unsupported biological exceptions must never receive a standard-code result.
 */
import {translate} from './dna.mjs';
import {circularFeatureSequence} from './feature-io.mjs';
const starts={1:new Set(['TTG','CTG','ATG']),11:new Set(['TTG','CTG','ATT','ATC','ATA','ATG','GTG'])};
export function interpretCDS(sequence,feature,{circular=false}={}){
 const q=feature.qualifiers??{};
 if(!q||typeof q!=='object'||Array.isArray(q))throw new RangeError('Invalid CDS qualifiers');
 for(const key of ['transl_except','exception','ribosomal_slippage','trans_splicing','pseudo','pseudogene','partial']){
   if(Object.hasOwn(q,key))throw new RangeError('Unsupported CDS biological instruction: /'+key);
 }
 function scalar(key,fallback){
   const value=Object.hasOwn(q,key)?q[key]:fallback;
   if(typeof value!=='string')throw new RangeError('Expected one string CDS /'+key);
   return value;
 }
 const table=scalar('transl_table','1'),codonStart=scalar('codon_start','1');
 if(!Object.hasOwn(starts,table))throw new RangeError('Unsupported CDS translation table: '+table+' (supported: 1, 11)');
 if(!/^[123]$/.test(codonStart))throw new RangeError('Invalid CDS /codon_start');
 const annotated=circularFeatureSequence(sequence,feature,{circular});
 const offset=Number(codonStart)-1,dna=annotated.slice(offset);
 if(dna.length<3)throw new RangeError('CDS has no complete codon after /codon_start');
 let protein=translate(dna,{partial:'ignore'});
 const startCodon=dna.slice(0,3),validStart=offset===0&&starts[table].has(startCodon);
 // INSDC uses methionine for a valid initiation codon in a complete CDS.
 if(validStart)protein='M'+protein.slice(1);
 const supplied=Object.hasOwn(q,'translation')?scalar('translation'):null;
 return {dna,protein,translationTable:Number(table),codonStart:Number(codonStart),
   annotatedLength:annotated.length,validStart,
   translationMatches:supplied===null?null:supplied===protein.replace(/\*$/,'')};
}
