/** Invoked by scripts/validate-biopython.py with synthetic, independently generated inputs. */
import {readFileSync} from 'node:fs';
import {parseGenbank,serializeGenbank,circularFeatureSequence} from '../src/core/feature-io.mjs';
import {TYPE_II_ENZYMES,restrictionSites} from '../src/core/restriction.mjs';
import {reverseComplement,translate,findMotif} from '../src/core/dna.mjs';
import {assembleOverlaps} from '../src/core/assembly.mjs';
const input=JSON.parse(readFileSync(0,'utf8'));
const records=input.genbank.map(text=>{
 const w=parseGenbank(text);
 return {working:w,exported:serializeGenbank(w),
   extracted:w.features.map(f=>circularFeatureSequence(w.seq,f,{circular:w.topology==='circular'}))};
});
const output={records,enzymes:TYPE_II_ENZYMES,
 sites:restrictionSites(input.sequence,Object.keys(TYPE_II_ENZYMES)),
 reverse:reverseComplement(input.sequence),protein:translate(input.sequence),
 ambiguousReverse:reverseComplement(input.ambiguityCodes),
 motifPairs:input.motifPairs.map(([base,pattern])=>findMotif(base,pattern).length>0),
 ambiguousProteins:input.ambiguousCodons.map(codon=>translate(codon)),
 assembly:assembleOverlaps(input.assembly.fragments,{minOverlap:20,maxOverlap:20})};
process.stdout.write(JSON.stringify(output));
