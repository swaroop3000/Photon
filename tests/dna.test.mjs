import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeDNA,reverseComplement,gcContent,translate,findMotif,editSequence,parseFASTA,toFASTA} from '../src/core/dna.mjs';

test('IUPAC sequence and motif ambiguity match by possible-base intersection',()=>{
 for(const [sequence,motif] of [['N','R'],['R','M'],['RY','MW']])
  assert.deepEqual(findMotif(sequence,motif),[{start:0,end:motif.length,strand:1}]);
 for(const [sequence,motif] of [['R','Y'],['Y','R'],['A','C']])assert.deepEqual(findMotif(sequence,motif),[]);
 assert.deepEqual(findMotif('R','M',{bothStrands:true}),[
  {start:0,end:1,strand:1},{start:0,end:1,strand:-1}]);
 assert.equal(translate('RAC'),'X','mixed N/D outcomes retain the documented X policy');
});

test('normalize DNA and reject invalid bases with location',()=>{
  assert.equal(normalizeDNA(' a c\ngt '),'ACGT');assert.equal(normalizeDNA('aug',{allowRNA:true}),'ATG');
  assert.throws(()=>normalizeDNA('ACU'),/position 2/);assert.throws(()=>normalizeDNA('ACGN',{allowAmbiguous:false}),/position 3/);
});
test('reverse complement is an involution including IUPAC ambiguity',()=>{
  const dna='ATGCRYSWKMBDHVN';assert.equal(reverseComplement(reverseComplement(dna)),dna);
  assert.equal(reverseComplement('ATGC'),'GCAT');
});
test('GC fraction handles empty and unknown-only sequences',()=>{
  assert.equal(gcContent(''),null);assert.equal(gcContent('NN'),null);assert.equal(gcContent('ATGC'),0.5);assert.equal(gcContent('GGNN'),1);
});
test('standard translation resolves ambiguity and stop codons',()=>{
  assert.equal(translate('ATGGCTTAA'),'MA*');assert.equal(translate('AATGGCTTAA',{frame:1}),'MA*');
  assert.equal(translate('GCN'),'A');assert.equal(translate('ATN'),'X');assert.equal(translate('ATGTAAGCT',{stopAtStop:true}),'M');
  assert.throws(()=>translate('ATGG',{partial:'error'}),/Trailing/);
});
test('motifs match IUPAC and circular boundary',()=>{
  assert.deepEqual(findMotif('AAAGCTT','AAG'),[{start:1,end:4,strand:1}]);
  assert.deepEqual(findMotif('TAA','AAT',{circular:true}),[{start:1,end:4,strand:1}]);
  assert.deepEqual(findMotif('ACG','CGT',{bothStrands:true}),[{start:0,end:3,strand:-1}]);
  assert.deepEqual(findMotif('ATAT','AT',{bothStrands:true}).map(x=>x.start),[0,2]);
});
test('edits shift downstream features and flag overlaps',()=>{
  const features=[{name:'up',start:0,end:2},{name:'overlap',start:3,end:7},{name:'down',start:8,end:10}];
  const result=editSequence('AACCGGTTAACC',features,{start:4,end:6,insert:'A'});
  assert.equal(result.sequence,'AACCATTAACC');assert.deepEqual(result.features.map(x=>[x.start,x.end,x.affected]),[[0,2,false],[3,6,true],[7,9,false]]);
  assert.equal(features[1].end,7); // original objects are untouched
});
test('insertion inside feature expands it and flags review',()=>{
  const r=editSequence('AAAAAA',[{start:1,end:5}],{start:3,end:3,insert:'GG'});
  assert.deepEqual([r.features[0].start,r.features[0].end,r.features[0].affected],[1,7,true]);
});
test('FASTA parses multiple records and supports line wrapping',()=>{
  assert.deepEqual(parseFASTA('>one title\nAC\nGT\n>two\nTT').map(x=>x.sequence),['ACGT','TT']);
  assert.equal(toFASTA('one','ACGT',{width:2}),'>one\nAC\nGT\n');
  assert.throws(()=>parseFASTA('ATGC'),/before FASTA header/);
});
test('invalid coordinate edits are rejected',()=>{
  assert.throws(()=>editSequence('ACTG',[],{start:-1,end:2}),/Invalid edit/);
  assert.throws(()=>editSequence('ACTG',[{start:1,end:8}],{start:0,end:1}),/Invalid feature/);
});
