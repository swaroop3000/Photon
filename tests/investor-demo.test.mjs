import test from 'node:test';
import assert from 'node:assert/strict';
import {createInvestorSample,investorEditPlan} from '../src/core/investor-demo.mjs';
import {parseGenbank,serializeGenbank} from '../src/core/feature-io.mjs';
import {analyzeAnnotatedCDS} from '../src/core/translation-analysis.mjs';
import {applyExplicitEdits,createEditorHistory} from '../src/core/photon-adapter.mjs';
test('investor sample round-trips through real GenBank and has an exact complete illustrative CDS',()=>{
 const sample=createInvestorSample();assert.deepEqual(parseGenbank(serializeGenbank(sample)),sample);
 const cds=analyzeAnnotatedCDS(sample)[0];assert.deepEqual(cds.flags,[]);assert.equal(cds.protein,'M'+'AE'.repeat(30)+'*');
});
test('example edit changes one unannotated base, preserves annotations and supports real undo',()=>{
 const sample=createInvestorSample(),plan=investorEditPlan(sample),edited=applyExplicitEdits(sample,[plan]).working;
 assert.equal(edited.seq.length,sample.seq.length);assert.notEqual(edited.seq,sample.seq);assert.deepEqual(edited.features,sample.features);
 const history=createEditorHistory(sample);history.apply(edited.seq);assert.deepEqual(history.undo(),sample);
});
test('guided edit refuses other projects and changed sample annotations',()=>{
 assert.throws(()=>investorEditPlan({...createInvestorSample(),seq:'ACGT'}),/fresh investor sample/);
 const sample=createInvestorSample();sample.features[0].name='changed';assert.throws(()=>investorEditPlan(sample),/fresh investor sample/);
});
