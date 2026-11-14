/** Independent, explicitly specified reference vectors.
 * Standard translation example used in Biopython documentation:
 * https://biopython.org/docs/latest/Tutorial/chapter_seq_objects.html
 * Fundamental complement / codon lookups agree with NCBI genetic code table 1:
 * https://www.ncbi.nlm.nih.gov/Taxonomy/Utils/wprintgc.cgi
 * This suite checks small deterministic examples, not assay-grade validation.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeDNA,reverseComplement,translate,findMotif,editSequence} from '../src/core/dna.mjs';

test('standard genetic code: documented translation vector including stops',()=>{
 const nucleotide='ATGGCCATTGTAATGGGCCGCTGAAAGGGTGCCCGATAG';
 assert.equal(translate(nucleotide),'MAIVMGR*KGAR*');
 assert.equal(translate(nucleotide,{stopAtStop:true}),'MAIVMGR');
});
test('Watson-Crick and IUPAC complement pairs are involutive',()=>{
 assert.equal(reverseComplement('ACGTRYSWKMBDHVN'),'NBDHVKMWSRYACGT');
 assert.equal(reverseComplement(reverseComplement('ACGTRYSWKMBDHVN')),'ACGTRYSWKMBDHVN');
});
test('palindromic EcoRI motif is reported once per recognition site',()=>{
 const seq='AACGAATTCTTGAATTC';
 assert.deepEqual(findMotif(seq,'GAATTC',{bothStrands:true}).map(x=>x.start),[3,11]);
});
test('circular motif crossing coordinate origin is reported with exclusive end',()=>{
 assert.deepEqual(findMotif('TTCGAA','AATT',{circular:true}),[{start:4,end:8,strand:1}]);
});
test('substitution keeps downstream coordinates while flagging affected annotations',()=>{
 const r=editSequence('AACCGGTT',[{name:'A',start:0,end:2},{name:'B',start:4,end:8}],
  {start:2,end:4,insert:'TT'});
 assert.equal(r.sequence,'AATTGGTT');
 assert.deepEqual(r.features.map(f=>[f.start,f.end,f.affected]),[[0,2,false],[4,8,false]]);
});
