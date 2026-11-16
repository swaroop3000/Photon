import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseGenbank,serializeGenbank} from '../src/core/feature-io.mjs';
import {analyzeAnnotatedCDS} from '../src/core/translation-analysis.mjs';
import {analyzeConstructQC} from '../src/core/construct-qc.mjs';
import {serializeSbol3NTriples} from '../src/core/sbol3-nt.mjs';
import {serializePhotonSbol} from '../src/core/sbol-io.mjs';
const source=readFileSync(new URL('./fixtures/genbank/J01749.1.gb',import.meta.url),'utf8');
const working=(seq,q={},strand=1)=>({name:'CDS',seq,topology:'linear',features:[
 {name:'gene',type:'CDS',start:1,end:seq.length,strand,qualifiers:q}]});

test('public pBR322 record imports 48 annotations and retains repeated citations and numeric qualifiers',()=>{
 const w=parseGenbank(source);
 assert.equal(w.seq.length,4361);assert.equal(w.features.length,48);
 assert.equal(w.topology,'circular');
 assert.deepEqual(w.features.find(f=>f.start===2730).qualifiers.citation,['[2]','[16]','[17]']);
 assert.equal(w.features.find(f=>f.type==='CDS').qualifiers.transl_table,'11');
 assert.deepEqual(parseGenbank(serializeGenbank(w)),w);
 const cds=analyzeAnnotatedCDS(w);
 assert.equal(cds.length,3);
 assert.ok(cds.every(f=>f.valid&&f.translationTable===11&&f.translationMatches));
});
test('repeated quoted qualifiers, numeric tokens and valueless flags survive export/import',()=>{
 const w=working('ATGAAATAA',{note:['first "quote"','second','third'],pseudo:true,codon_start:'1',transl_table:'11'});
 assert.deepEqual(parseGenbank(serializeGenbank(w)),w);
 assert.throws(()=>serializeSbol3NTriples(w),/qualifier/i);
 assert.throws(()=>serializePhotonSbol(w),/qualifier/i);
});
test('malformed arrays, unsupported flags/tokens and duplicated semantic labels fail closed',()=>{
 for(const value of [[],['one'],[true,true],['a',{}],false,17]){
  assert.throws(()=>serializeGenbank(working('ATGAAATAA',{note:value})),/qualifier/i);
 }
 const text=serializeGenbank(working('ATGAAATAA'));
 for(const row of ['/unknown_flag','/note=unquoted','/transl_table=abc','/codon_start=0',
   '/label="duplicate"','/pseudo\n                     /pseudo']){
   assert.throws(()=>parseGenbank(text.replace('ORIGIN','                     '+row+'\nORIGIN')),/qualifier|label/i);
 }
});
test('codon_start is applied in biological strand order and flags partial translation',()=>{
 for(const [seq,strand] of [['AATGAAATAA',1],['TTATTTCATT',-1]]){
  const w=working(seq,{codon_start:'2',translation:'MK'},strand),r=analyzeAnnotatedCDS(w)[0];
  assert.equal(r.protein,'MK*');assert.equal(r.translationMatches,true);
  assert.equal(r.annotatedLength,10);assert.equal(r.nucleotideLength,9);
  assert.ok(r.flags.includes('PARTIAL_CODON_START'));
  assert.ok(!analyzeConstructQC(w).features[0].problems.includes('CDS_FRAME'));
 }
});
test('table 11 initiation differs from table 1 and internal codons retain their residue',()=>{
 const a=analyzeAnnotatedCDS(working('GTGGTGTAA',{transl_table:'11'}))[0];
 assert.equal(a.protein,'MV*');
 const b=analyzeAnnotatedCDS(working('GTGGTGTAA',{transl_table:'1'}))[0];
 assert.equal(b.protein,'VV*');
 assert.equal(analyzeAnnotatedCDS(working('CTGCTGTAA'))[0].protein,'ML*');
});
test('unsupported CDS biology produces an explicit diagnostic without a computed peptide or standard-code QC claims',()=>{
 for(const q of [{transl_table:'2'},{transl_except:'(pos:4..6,aa:Sec)'},{exception:'RNA editing'},
  {ribosomal_slippage:true},{trans_splicing:true},{pseudo:true},{pseudogene:'unknown'},
  {partial:true},{codon_start:['1','2']},{translation:['MK','MR']},{codon_start:'0'}]){
  const w=working('ATGTAATAA',q),r=analyzeAnnotatedCDS(w)[0];
  assert.equal(r.valid,false);assert.equal(r.protein,undefined);assert.ok(r.error);
  const qc=analyzeConstructQC(w);
  assert.deepEqual(qc.features[0].problems,['CDS_UNSUPPORTED_SEMANTICS']);
  assert.ok(qc.warnings.some(x=>x.code==='CDS_UNSUPPORTED_SEMANTICS'));
 }
});
test('mismatched supplied peptide is diagnostic rather than silently trusted',()=>{
 const w=working('ATGAAATAA',{translation:'MR'});
 assert.ok(analyzeAnnotatedCDS(w)[0].flags.includes('ANNOTATED_TRANSLATION_MISMATCH'));
 assert.ok(analyzeConstructQC(w).features[0].problems.includes('CDS_TRANSLATION_MISMATCH'));
});
