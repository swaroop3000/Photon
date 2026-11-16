import test from 'node:test';import assert from 'node:assert/strict';
import {newProjectWorking} from '../src/core/new-project.mjs';
import {createExampleConstruct} from '../src/core/example-construct.mjs';
import {parseGenbank,serializeGenbank} from '../src/core/feature-io.mjs';
import {analyzeAnnotatedCDS} from '../src/core/translation-analysis.mjs';
test('normal project creation validates input and supports empty working copies',()=>{
 assert.deepEqual(newProjectWorking({name:' Empty '}),{name:'Empty',seq:'',topology:'linear',features:[]});
 assert.equal(newProjectWorking({name:'DNA',sequence:'a c\ngt'}).seq,'ACGT');
 for(const fields of [{name:''},{name:'   '},{name:'A',sequence:'X'},{name:'A',topology:'bad'}])assert.throws(()=>newProjectWorking(fields));
});
test('example annotations round-trip and are copied only for the unchanged template',()=>{
 const template=createExampleConstruct(),working=newProjectWorking({name:'Example_DNA',sequence:template.seq,topology:template.topology,template});
 assert.deepEqual(parseGenbank(serializeGenbank(working)),working);
 assert.deepEqual(analyzeAnnotatedCDS(working)[0].flags,[]);
 working.features[0].qualifiers.note='changed';assert.notEqual(template.features[0].qualifiers.note,'changed');
 assert.deepEqual(newProjectWorking({name:'Changed',sequence:template.seq+'A',topology:template.topology,template}).features,[]);
 assert.deepEqual(newProjectWorking({name:'Linear',sequence:template.seq,topology:'linear',template}).features,[]);
});
