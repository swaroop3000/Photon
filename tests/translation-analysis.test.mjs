import test from 'node:test';
import assert from 'node:assert/strict';
import {sixFrameTranslation,analyzeAnnotatedCDS,translateConstructReport,serializeTranslationReport} from '../src/core/translation-analysis.mjs';
const working=(seq,features=[],topology='linear')=>({name:'t',seq,topology,features});
test('six frames have correct codon offsets, strands and original coordinates',()=>{
 const r=sixFrameTranslation(working('ATGAAATAA'),{minimumAminoAcids:1});
 assert.deepEqual(r.frames.map(f=>f.id),['+1','+2','+3','-1','-2','-3']);
 assert.equal(r.frames[0].proteinPreview,'MK*');
 assert.deepEqual(r.frames[0].codons.map(c=>[c.start,c.end]),[[1,3],[4,6],[7,9]]);
 assert.deepEqual(r.frames[3].codons.map(c=>[c.start,c.end]),[[7,9],[4,6],[1,3]]);
 assert.ok(r.candidates.some(o=>o.frame==='+1'&&o.start===1&&o.end===9&&o.protein==='MK'));
});
test('minus strand ORF coordinates and complete peptide correct',()=>{
 const r=sixFrameTranslation(working('TTATTTCAT'),{minimumAminoAcids:1});
 const reverse=r.candidates.find(o=>o.frame==='-1');
 assert.deepEqual([reverse.start,reverse.end,reverse.protein],[1,9,'MK']);
});
test('CDS analysis respects reverse complement and circular origin spans',()=>{
 const plus=analyzeAnnotatedCDS(working('ATGAAATAA',[{name:'gene',type:'CDS',start:1,end:9,strand:1}]));
 assert.deepEqual(plus[0].flags,[]);
 assert.equal(plus[0].protein,'MK*');
 const reverse=analyzeAnnotatedCDS(working('TTATTTCAT',[{name:'reverse',type:'CDS',start:1,end:9,strand:-1}]));
 assert.equal(reverse[0].protein,'MK*');
 const circular=analyzeAnnotatedCDS(working('AAATAAATG',[{name:'wrap',type:'CDS',start:7,end:6,strand:1}],'circular'));
 assert.deepEqual(circular[0].flags,[]);
 assert.equal(circular[0].protein,'MK*');
});
test('CDS flags malformed translation without mutating the annotation',()=>{
 const w=working('ATGTAATAAA',[{name:'bad',type:'CDS',start:1,end:10,strand:1}]);
 const original=JSON.stringify(w),cds=analyzeAnnotatedCDS(w)[0];
 assert.ok(cds.flags.includes('LENGTH_NOT_DIVISIBLE_BY_3'));
 assert.ok(cds.flags.includes('INTERNAL_STOP'));
 assert.equal(JSON.stringify(w),original);
});
test('invalid coordinates are reported, not treated as legitimate CDS',()=>{
 const r=analyzeAnnotatedCDS(working('ATGC',[{type:'CDS',name:'bad',start:6,end:2}]));
 assert.equal(r[0].valid,false);
 assert.match(r[0].error,/1-based/);
});
test('translation report is versioned JSON and rejects invalid inputs',()=>{
 const r=translateConstructReport(working('ATGAAATAA'),{minimumAminoAcids:1});
 assert.equal(JSON.parse(serializeTranslationReport(r)).format,'photon/translation/1');
 assert.throws(()=>sixFrameTranslation(working('')),/length/);
 assert.throws(()=>sixFrameTranslation(working('ATG'),{minimumAminoAcids:0}),/minimum/);
 assert.throws(()=>serializeTranslationReport({format:'wrong'}),/Unsupported/);
});
test('frame previews bounded for large sequences',()=>{
 const r=sixFrameTranslation(working('ATG'.repeat(800)),{minimumAminoAcids:1});
 assert.equal(r.frames[0].codons.length,500);
 assert.equal(r.frames[0].previewTruncated,true);
});
