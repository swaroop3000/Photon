import test from 'node:test';
import assert from 'node:assert/strict';
import {applySequenceRevision,createEditorHistory} from '../src/core/photon-adapter.mjs';

test('nested qualifiers do not alias the input or returned editor history',()=>{
 const original={name:'metadata',topology:'linear',seq:'AACCGGTTAACC',
  features:[{name:'gene',type:'CDS',start:4,end:8,qualifiers:{note:'verified',evidence:{source:'curated'}}}]};
 const history=createEditorHistory(original);
 original.features[0].qualifiers.evidence.source='mutated outside history';
 assert.equal(history.current.features[0].qualifiers.evidence.source,'curated');
 const view=history.current;
 view.features[0].qualifiers.evidence.source='mutated view';
 assert.equal(history.current.features[0].qualifiers.evidence.source,'curated');
 const next=history.apply('AACCGGTTAACCA');
 next.working.features[0].qualifiers.evidence.source='mutated returned edit';
 assert.equal(history.current.features[0].qualifiers.evidence.source,'curated');
 assert.equal(history.undo().features[0].qualifiers.evidence.source,'curated');
});
test('sequence revision never shares nested annotation metadata with input',()=>{
 const working={name:'metadata',topology:'linear',seq:'AACCGGTTAACC',
  features:[{name:'gene',type:'CDS',start:4,end:8,qualifiers:{evidence:{source:'reviewed'}}}]};
 const next=applySequenceRevision(working,'AACCGGTTAACCA').working;
 next.features[0].qualifiers.evidence.source='modified';
 assert.equal(working.features[0].qualifiers.evidence.source,'reviewed');
});
